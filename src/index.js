import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { config } from './config/config.js';
import { loadEvents } from './utils/eventLoader.js';

// Setup process error handling
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

async function main() {
  try {
    // Create a new client instance with necessary intents
    const client = new Client({ 
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ] 
    });

    // Initialize commands collection
    client.commands = new Collection();

    // Load all event handlers
    await loadEvents(client);

    // Login to Discord with token
    await client.login(config.token);

    console.log('Starting Discord bot...');
    console.log('✅ Use "/hello" or "/ping" to test the commands');
    console.log('⚠️ Make sure your .env file contains DISCORD_TOKEN and APP_ID');
  } catch (error) {
    console.error('Failed to start the bot:', error);
    process.exit(1);
  }
}

main();
