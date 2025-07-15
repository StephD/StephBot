import { SlashCommandBuilder } from 'discord.js';

export const data = [
  new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Replies with a friendly hello message'),
];

// Execute function that handles both commands
export async function execute(interaction, client) {
  const commandName = interaction.commandName;
  
  // Handle hello command
  if (commandName === 'hello') {
    const env = process.env.NODE_ENV === 'development' ? 'dev' : '';
    await interaction.reply('👋 Hello ' + env + ' ! This is a basic Discord bot response.');
  }
}
