import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { callExternalApi, formatApiResponse } from '../utils/api.js';
import { Colors } from '../utils/colors.js';

// Export an array of command data objects
export const data = [
  // Hello command
  new SlashCommandBuilder()
    .setName('hello')
    .setDescription('Replies with a friendly hello message'),
  
  // Secret command
  new SlashCommandBuilder()
    .setName('secret')
    .setDescription('Replies with a secret message'),
  
  // only Admin role
  new SlashCommandBuilder()
    .setName('onlyadmin')
    .setDescription('Replies with a secret message')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  
  // only Mod role
  new SlashCommandBuilder()
    .setName('onlymod')
    .setDescription('Replies with a secret message')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  
  // only Booster role - no built-in permission for boosters
  new SlashCommandBuilder()
    .setName('onlybooster')
    .setDescription('Replies with a secret message'),
  
  // API command
  new SlashCommandBuilder()
    .setName('api')
    .setDescription('Tests an external API and returns the response')
    .addStringOption(option => 
      option.setName('url')
        .setDescription('The URL of the API to test')
        .setRequired(true)
    ).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
];

// Execute function that handles both commands
export async function execute(interaction, client) {
  const commandName = interaction.commandName;
  
  // Handle hello command
  if (commandName === 'hello') {
    const env = process.env.NODE_ENV === 'development' ? 'dev' : '';
    await interaction.reply('👋 Hello ' + env + ' ! This is a basic Discord bot response.');
  }
  
  // Handle ping command
  // else if (commandName === 'ping') {
  //   const guildName = interaction.guild ? interaction.guild.name : 'Direct Message';
  //   const guildId = interaction.guild ? interaction.guild.id : 'N/A';
  //   const response = await interaction.reply({ content: `Pinging... (Server: **${guildName}**)` });
  //   const sent = response;
  //   const latency = sent.createdTimestamp - interaction.createdTimestamp;
  //   await interaction.editReply(`Pong! Bot latency: ${latency}ms | API Latency: ${Math.round(client.ws.ping)}ms | Server: ${guildName}, Guild ID: ${guildId}`);
  // }
  
  // Handle secret command
  else if (commandName === 'secret') {
    await interaction.reply({ 
      content: 'This is a secret message!', 
      flags: ['Ephemeral'] 
    });
  }

  // Handle onlyadmin command
  else if (commandName === 'onlyadmin') {
    await interaction.reply('You are an admin!', {
      color: Colors.ADMIN
    });
  }

  // Handle onlymod command
  else if (commandName === 'onlymod') {
    await interaction.reply('You are a moderator!', {
      color: Colors.MODERATOR
    });
  }

  // Handle onlybooster command
  else if (commandName === 'onlybooster') {
    // Check if the user is a server booster
    if (interaction.member.premiumSince) {
      await interaction.reply('You are a booster! Thank you for supporting the server!');
    } else {
      await interaction.reply({ 
        content: 'This command is only available to server boosters.', 
        flags: ['Ephemeral'] 
      });
    }
  }
  
  // Handle api command
  else if (commandName === 'api') {
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
