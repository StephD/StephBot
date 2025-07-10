import { REST, Routes } from 'discord.js';
import { config } from '../config/config.js';
import { loadCommands } from './commandLoader.js';

export async function registerCommands(client) {
  try {
    console.log('Started refreshing application commands.');

    // Load all commands
    const commands = await loadCommands(client);
    
    if (commands.length === 0) {
      console.warn('⚠️ No commands found to register.');
      return;
    }

    // Create REST instance
    const rest = new REST({ version: '10' }).setToken(config.token);

    // Register commands with Discord
    await rest.put(
      Routes.applicationCommands(config.appId),
      { body: commands },
    );

    console.log(`✅ Successfully registered ${commands.length} application commands.`);
  } catch (error) {
    console.error('❌ Error registering commands:', error);
  }
}
