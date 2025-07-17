import { REST, Routes } from 'discord.js';
import { config } from '../config/config.js';
import { loadCommands } from './commandLoader.js';

export async function registerCommands(client) {
  try {
    // console.log('Started refreshing application commands.');

    // Load all commands
    const commands = await loadCommands(client);
    
    if (commands.length === 0) {
      console.warn('⚠️ No commands found to register.');
      return;
    }

    const rest = new REST({ version: '10' }).setToken(config.token);

    // Get the main guild ID from config or environment variables
    const guildId = config.guildId || process.env.GUILD_ID;

    if (guildId) {
      // Register commands with a specific guild (faster for development)
      try {
        console.log(`Registering guild commands for guild ID: ${guildId}`);
        await rest.put(
          Routes.applicationGuildCommands(config.appId, guildId),
          { body: commands },
        );
        console.log(`✅ Successfully registered ${commands.length} guild commands. These should appear immediately.`);
      } catch (guildError) {
        console.error(`❌ Error registering guild commands:`, guildError);
        console.log('Falling back to global command registration...');
        
        // Fall back to global commands if guild registration fails
        await rest.put(
          Routes.applicationCommands(config.appId),
          { body: commands },
        );
        console.log(`✅ Successfully registered ${commands.length} global commands. These may take up to an hour to appear.`);
      }
    } else {
      // Register global commands (can take up to an hour to propagate)
      await rest.put(
        Routes.applicationCommands(config.appId),
        { body: commands },
      );
      console.log(`✅ Successfully registered ${commands.length} global commands.`);
    }
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
}
