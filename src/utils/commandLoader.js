import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Recursively loads commands from files and directories
 * @param {Object} client - The Discord client
 * @param {Array} commandsArray - Array to store command data for registration
 * @param {Array} commandNames - Array to collect command names
 * @param {string} dirPath - Directory path to load commands from
 */
async function loadCommandsFromDirectory(client, commandsArray, commandNames, dirPath) {
  // Read all items in the directory
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      // Check if directory has an index.js file
      const indexPath = path.join(itemPath, 'index.js');
      if (fs.existsSync(indexPath)) {
        // Load the index.js file as a command
        try {
          const filePath = `file://${indexPath}`;
          const command = await import(filePath);
          
          if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            commandsArray.push(command.data);
            commandNames.push(command.data.name);
            console.log(`  - Loaded command from directory: ${command.data.name}`);
          } else {
            console.warn(`⚠️ The command at ${indexPath} is missing required "data" or "execute" properties.`);
          }
        } catch (error) {
          console.error(`❌ Error loading command from ${indexPath}:`, error);
        }
      } else {
        // Recursively load commands from subdirectory
        await loadCommandsFromDirectory(client, commandsArray, commandNames, itemPath);
      }
    } else if (item.endsWith('.js')) {
      // Load individual command file
      try {
        const filePath = `file://${itemPath}`;
        const command = await import(filePath);
        
        // Check if command has required data and execute function
        if ('data' in command && 'execute' in command) {
          // Handle both single commands and arrays of commands
          if (Array.isArray(command.data)) {
            // Multiple commands in one file
            for (const commandData of command.data) {
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
          console.warn(`⚠️ The command at ${itemPath} is missing required "data" or "execute" properties.`);
        }
      } catch (error) {
        console.error(`❌ Error loading command from ${itemPath}:`, error);
      }
    }
  }
}

export async function loadCommands(client) {
  try {
    // Get the commands directory path
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const commandsPath = path.join(__dirname, '..', 'commands');
    
    // Collection to store command data for registration
    const commandsArray = [];
    
    // Array to collect command names
    const commandNames = [];
    
    console.log('Loading commands...');
    // Load commands recursively from the commands directory
    await loadCommandsFromDirectory(client, commandsArray, commandNames, commandsPath);
    
    // Log all commands in a single line
    console.log(`✅ Command loaded: ${commandNames.join(' / ')}`);
    
    return commandsArray;
  } catch (error) {
    console.error('❌ Error loading commands:', error);
    return [];
  }
}
