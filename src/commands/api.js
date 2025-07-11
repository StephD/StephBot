import { SlashCommandBuilder } from 'discord.js';

// Define the command data using SlashCommandBuilder
export const data = new SlashCommandBuilder()
  .setName('api')
  .setDescription('Tests an external API and returns the response')
  .addStringOption(option => 
    option.setName('url')
      .setDescription('The URL of the API to test')
      .setRequired(true)
  );

/**
 * Call an external API and return the response
 * @param {string} url - The URL to call
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
async function callExternalApi(url) {
  try {
    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { success: false, error: 'Invalid URL format. URL must start with http:// or https://' };
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    // Check if the response is JSON
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return { 
      success: response.ok, 
      data,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function execute(interaction) {
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
      // Format the response data
      const formattedData = typeof apiResponse.data === 'object' 
        ? JSON.stringify(apiResponse.data, null, 2)
        : apiResponse.data.toString();
      
      // Truncate if too long (Discord has a 2000 character limit)
      const truncatedData = formattedData.length > 1900 
        ? formattedData.substring(0, 1900) + '... (truncated)'
        : formattedData;
      
      responseContent = `API Response:\n\`\`\`json\n${truncatedData}\n\`\`\``;
    } else {
      responseContent = `Error calling API: ${apiResponse.error || 'Unknown error'}`;
    }
    
    // Send the follow-up message with the API response
    await interaction.editReply({
      content: responseContent
    });
    
  } catch (error) {
    console.error('Error handling testapi command:', error);
    
    // Send error response
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(`Error: ${error.message}`);
    } else {
      await interaction.reply({ content: `Error: ${error.message}`, ephemeral: true });
    }
  }
}