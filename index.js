import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { loadEvents } from './src/utils/eventLoader.js';
import * as dotenv from 'dotenv';

// Load environment variables first, before any other code runs
if (process.env.NODE_ENV === 'development') {
  console.log('Development environment detected. Loading development environment variables...');
  dotenv.config({ path: '.env.development' });
} else if (process.env.NODE_ENV === 'production') {
  console.log('Production environment detected. Loading production environment variables...');
  dotenv.config();
} else {
  console.log('No specific environment detected. Loading default environment variables...');
  dotenv.config();
}

// Setup process error handling
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Create a new client instance with necessary intents
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,     // Required for accessing guild members
    GatewayIntentBits.GuildPresences,   // Required for accessing member presence data
    GatewayIntentBits.GuildMessageReactions, // Required for detecting reactions on messages
    GatewayIntentBits.DirectMessages    // Required for DM interactions
  ] 
});

// Enable partials to allow handling reactions on uncached messages and DMs
client.options.partials = ['MESSAGE', 'CHANNEL', 'REACTION', 'USER'];

// Initialize commands collection
client.commands = new Collection();

async function main() {
  try {
    // Load all event handlers
    await loadEvents(client);

    // Login to Discord with token
    await client.login(process.env.DISCORD_TOKEN);
    
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
