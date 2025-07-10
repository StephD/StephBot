import { Client, Collection, GatewayIntentBits } from 'discord.js';
import 'dotenv/config';
import { loadEvents } from './src/utils/eventLoader.js';

// Setup process error handling
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

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

async function main() {
  try {
    // Load all event handlers
    await loadEvents(client);

    // Login to Discord with token
    await client.login(process.env.DISCORD_TOKEN);

    console.log('Starting Discord bot...');
    // console.log('✅ Use "/hello" or "/ping" to test the commands');
  } catch (error) {
    console.error('Failed to start the bot:', error);
    process.exit(1);
  }
}

main();

// The bot is using a modular structure with separate files for:
// - Commands (src/commands/)
// - Events (src/events/)
// - Utilities (src/utils/)
// - Configuration (src/config/)
