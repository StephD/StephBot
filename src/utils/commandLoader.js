import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const DM_ALLOWED_COMMANDS = [
  'booster'
];

export async function loadCommands(client) {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandsArray = [];
    const commandNames = [];
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
      const filePath = `file://${path.join(commandsPath, file)}`;
      
      try {
        const command = await import(filePath);
        
        if ('data' in command && 'execute' in command) {
          if (Array.isArray(command.data)) {
            // Multiple commands in one file
            for (const commandData of command.data) {
              const isDmAllowed = DM_ALLOWED_COMMANDS.includes(commandData.name);
              commandData.dm_permission = isDmAllowed;
              
              client.commands.set(commandData.name, {
                data: commandData,
                execute: command.execute
              });
              commandsArray.push(commandData);
              commandNames.push(commandData.name);
            }
          } else {
            // Single command in the file
            const isDmAllowed = DM_ALLOWED_COMMANDS.includes(command.data.name);
            command.data.dm_permission = isDmAllowed;
            
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
    
    if (commandNames.length > 0) {
      console.log(`✅ Commands loaded: ${commandNames.join(' / ')}`);
    } else {
      console.warn('⚠️ No commands were loaded');
    }
    
    return commandsArray;
  } catch (error) {
    console.error('❌ Error loading commands:', error);
    return [];
  }
}
