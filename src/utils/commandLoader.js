import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export async function loadCommands(client) {
  try {
    // Get the commands directory path
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    // Collection to store command data for registration
    const commandsArray = [];
    
    // Array to collect command names
    const commandNames = [];
    
    // Load each command file
    for (const file of commandFiles) {
      try {
        const filePath = `file://${path.join(commandsPath, file)}`;
        // Dynamic import for ESM
        const command = await import(filePath);
        
        // Check if command has required data and execute function
        if ('data' in command && 'execute' in command) {
          // Handle both single commands and arrays of commands
          if (Array.isArray(command.data)) {
            // Multiple commands in one file
            for (const commandData of command.data) {
              // Register each command with the same execute function
              client.commands.set(commandData.name, {
                data: commandData,
                execute: command.execute
              });
              commandsArray.push(commandData);
              commandNames.push(commandData.name);
            }
          } else {
            // Single command in the file
            client.commands.set(command.data.name, command);
            commandsArray.push(command.data);
            commandNames.push(command.data.name);
          }
        } else {
          console.warn(`⚠️ The command at ${file} is missing required "data" or "execute" properties.`);
        }
      } catch (error) {
        console.error(`❌ Error loading command from ${file}:`, error);
      }
    }
    
    // Log all commands in a single line
    console.log(`✅ Command loaded: ${commandNames.join(' / ')}`);
    
    return commandsArray;
  } catch (error) {
    console.error('❌ Error loading commands:', error);
    return [];
  }
}
