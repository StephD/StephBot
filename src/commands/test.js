import { SlashCommandBuilder } from 'discord.js';

// Export an array of command data objects
export const data = [
  // Hello command
  new SlashCommandBuilder()
    .setName('hello2')
    .setDescription('Replies with a friendly hello message'),
  
  // Ping command
  new SlashCommandBuilder()
    .setName('ping2')
    .setDescription('Replies with the bot latency')
];

// Execute function that handles both commands
export async function execute(interaction, client) {
  const commandName = interaction.commandName;
  
  // Handle hello command
  if (commandName === 'hello2') {
    await interaction.reply('👋 Hello local2! This is a basic Discord bot response.');
  }
  
  // Handle ping command
  else if (commandName === 'ping2') {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(`Pong! Bot latency: ${latency}ms | API Latency: ${Math.round(client.ws.ping)}ms`);
  }
}
