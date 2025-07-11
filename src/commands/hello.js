import { SlashCommandBuilder } from 'discord.js';

// Export an array of command data objects
export const data = [
  // Hello command
  new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Replies with a friendly hello message'),
    new SlashCommandBuilder()
      .setName('hello2')
      .setDescription('Replies with a friendly hello2 message'),
  
  // Ping command
  new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Replies with the bot latency')
];

// Execute function that handles both commands
export async function execute(interaction, client) {
  const commandName = interaction.commandName;
  
  // Handle hello command
  if (commandName === 'hello') {
    await interaction.reply('👋 Hello! This is a basic Discord bot response.');
  }
  
  // Handle hello2 command
  if (commandName === 'hello2') {
    await interaction.reply('👋 Hello2! This is a basic Discord bot response.');
  }
  
  // Handle ping command
  else if (commandName === 'ping') {
    const guildName = interaction.guild ? interaction.guild.name : 'Direct Message';
    const guildId = interaction.guild ? interaction.guild.id : 'N/A';
    const sent = await interaction.reply({ content: `Pinging... (Server: **${guildName}**)`, fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(`Pong! Bot latency: ${latency}ms | API Latency: ${Math.round(client.ws.ping)}ms | Server: ${guildName}, Guild ID: ${guildId}`);
  }
}
