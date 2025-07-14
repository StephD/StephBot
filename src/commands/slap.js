import { SlashCommandBuilder } from 'discord.js';

// Define the command data using SlashCommandBuilder
export const data = new SlashCommandBuilder()
  .setName('slap')
  .setDescription('Slap someone with a trout')
  .addUserOption(option =>
    option
      .setName('target')
      .setDescription('The user to slap')
      .setRequired(true)
  )
  .addStringOption(option =>
    option
      .setName('item')
      .setDescription('What to slap them with (default: a large trout)')
      .setRequired(false)
  );

// Execute function that handles the command logic
export async function execute(interaction, client) {
  try {
    // Get the target user and optional item
    const target = interaction.options.getUser('target');
    const item = interaction.options.getString('item') || 'a large trout';
    
    // Handle self-slap case
    if (target.id === interaction.user.id) {
      return await interaction.reply({
        content: `*${interaction.user.username} slaps themselves with ${item}. That looked like it hurt!*`,
        allowedMentions: { users: [] } // Prevent mentions
      });
    }
    
    // Handle slapping others
    await interaction.reply({
      content: `*${interaction.user.globalName} slaps ${target} with ${item}*`,
      allowedMentions: { users: [] } // Prevent mentions
    });
    
  } catch (error) {
    console.error('Error executing slap command:', error);
    
    const errorMessage = `An error occurred while executing the command: ${error.message}`;
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errorMessage, flags: ['Ephemeral'] });
    } else {
      await interaction.reply({ content: errorMessage, flags: ['Ephemeral'] });
    }
  }
}
