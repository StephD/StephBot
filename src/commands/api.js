import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Colors } from '../utils/colors.js';
import { callExternalApi, formatApiResponse } from '../utils/api.js';

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

// Export an array of command data objects
// Commands will only be included if we're in development mode
export const data = isDev ? [
  new SlashCommandBuilder()
  .setName('api')
  .setDescription('Tests an external API and returns the response')
  .addStringOption(option => 
    option.setName('url')
        .setDescription('The URL of the API to test')
        .setRequired(true)
    ).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
] : [];


// Execute function that handles both commands
export async function execute(interaction, client) {
  const commandName = interaction.commandName;
  const subcommand = interaction.options.getSubcommand();
  
  // Handle api command
  if (isDev && commandName === 'api') {
    try {
      // Get the URL from the command options
      const apiUrl = interaction.options.getString('url');
      
      // Send an initial response to acknowledge the command
      await interaction.deferReply();
      
      // Call the external API
      const apiResponse = await callExternalApi(apiUrl);
      
      // Prepare the response content
      let responseContent;
      if (apiResponse.success) {
        // Format the response data using the utility function
        const truncatedData = formatApiResponse(apiResponse.data);
        responseContent = `API Response:\n\`\`\`json\n${truncatedData}\n\`\`\``;
      } else {
        responseContent = `Error calling API: ${apiResponse.error || 'Unknown error'}`;
      }
      
      // Send the follow-up message with the API response
      await interaction.editReply({
        content: responseContent
      });
      
    } catch (error) {
      console.error('Error handling api command:', error);
      
      // Send error response
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(`Error: ${error.message}`);
      } else {
        await interaction.reply({ content: `Error: ${error.message}`, flags: ['Ephemeral'] });
      }
    }
  }
}
