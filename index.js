import 'dotenv/config';
import { Client, Events, GatewayIntentBits, Collection, REST, Routes } from 'discord.js';

// Create a new client instance with necessary intents
const client = new Client({ 
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ] 
});

// Command collection for slash commands
client.commands = new Collection();

// Define slash commands
const commands = [
  {
    name: 'hello',
    description: 'Replies with a friendly hello message',
    // Adding application command options would go here if needed
  },
  {
    name: 'ping',
    description: 'Replies with the bot latency',
  },
];

// Function to register slash commands with Discord API
async function registerCommands() {
  try {
    console.log('Started refreshing application commands.');

    // Create REST instance
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

    // Register commands with Discord
    await rest.put(
      Routes.applicationCommands(process.env.APP_ID),
      { body: commands },
    );

    console.log('Successfully reloaded application commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, (readyClient) => {
  console.log(`🚀 Ready! Logged in as ${readyClient.user.tag}`);
  
  // Register slash commands
  registerCommands();
});

// Handle interaction events (slash commands)
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // Handle /hello command
  if (commandName === 'hello') {
    await interaction.reply('👋 Hello! This is a basic Discord bot response.');
  }
  
  // Handle /ping command
  else if (commandName === 'ping') {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(`Pong! Bot latency: ${latency}ms | API Latency: ${Math.round(client.ws.ping)}ms`);
  }
});

// Error handling
client.on(Events.Error, error => {
  console.error('Discord client error:', error);
});

// Add simple process error handling
process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

// Login to Discord with your client's token
client.login(process.env.DISCORD_TOKEN);

console.log('Starting Discord bot...');
console.log('✅ Use "/hello" or "/ping" to test the commands');
console.log('⚠️ Make sure your .env file contains DISCORD_TOKEN and APP_ID');
