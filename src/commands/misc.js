import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
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
    
  // Click Me command with button
  new SlashCommandBuilder()
    .setName('clickme')
    .setDescription('Displays a button that you can click'),
    
  // Buttons command with embed and multiple buttons
  new SlashCommandBuilder()
    .setName('buttons')
    .setDescription('Displays an embed with multiple interactive buttons'),
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
  
  // Handle buttons command with embed and multiple buttons
  else if (commandName === 'buttons') {
    // Create an embed
    const embed = new EmbedBuilder()
      .setTitle('Interactive Buttons Example')
      .setDescription('This is an example of interactive buttons in Discord. Click the buttons below to see what happens!')
      .setColor(Colors.SUCCESS)
      .addFields(
        { name: 'Button 1', value: 'Click the primary button to see a success message', inline: true },
        { name: 'Button 2', value: 'Click the secondary button to see the embed change', inline: true }
      )
      .setFooter({ text: 'Buttons will become inactive after 2 minutes' })
      .setTimestamp();
    
    // Create two buttons with different styles
    const primaryButton = new ButtonBuilder()
      .setCustomId('primary_button')
      .setLabel('Primary Button')
      .setStyle(ButtonStyle.Primary);
    
    const secondaryButton = new ButtonBuilder()
      .setCustomId('secondary_button')
      .setLabel('Secondary Button')
      .setStyle(ButtonStyle.Secondary);
    
    // Add the buttons to an action row
    const row = new ActionRowBuilder()
      .addComponents(primaryButton, secondaryButton);
    
    // Send the message with the embed and buttons
    const response = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true
    });
    
    // Create a collector for button interactions
    const collector = response.createMessageComponentCollector({ time: 120000 }); // 2 minutes timeout
    
    // Handle button clicks
    collector.on('collect', async i => {
      try {
        if (i.customId === 'primary_button') {
          // Respond with a success message
          await i.reply({ 
            content: 'You clicked the primary button! This is a success message that only you can see.', 
            flags: ['Ephemeral'] 
          });
        } else if (i.customId === 'secondary_button') {
          // Update the embed
          const updatedEmbed = EmbedBuilder.from(embed)
            .setTitle('Embed Updated!')
            .setDescription('You clicked the secondary button and the embed has been updated!')
            .setColor('#FF9900') // Orange color
            .setTimestamp();
          
          // Update the message
          await i.update({ embeds: [updatedEmbed] });
        }
      } catch (error) {
        console.error('Error handling button interaction:', error);
        await i.reply({ 
          content: `Error: ${error.message}`, 
          flags: ['Ephemeral'] 
        }).catch(console.error);
      }
    });
    
    // Handle collector end
    collector.on('end', collected => {
      try {
        // Disable the buttons when the collector ends
        const disabledRow = new ActionRowBuilder()
          .addComponents(
            ButtonBuilder.from(primaryButton).setDisabled(true),
            ButtonBuilder.from(secondaryButton).setDisabled(true)
          );
        
        // Update the message with disabled buttons
        interaction.editReply({
          content: 'These buttons are no longer active.',
          embeds: [embed],
          components: [disabledRow]
        }).catch(error => console.error('Error updating message:', error));
      } catch (error) {
        console.error('Error in collector end handler:', error);
      }
    });
  }
  
  // Handle clickme command
  else if (commandName === 'clickme') {
    // Create buttons
    const button1 = new ButtonBuilder()
      .setCustomId('click_me_button')
      .setLabel('Click Me!')
      .setStyle(ButtonStyle.Primary);
      
    const button2 = new ButtonBuilder()
      .setCustomId('click_me_2_button')
      .setLabel('Click Me 2 (Modal)')
      .setStyle(ButtonStyle.Success);
    
    // Add the buttons to an action row
    const row = new ActionRowBuilder()
      .addComponents(button1, button2);
    
    // Send the message with the buttons
    const response = await interaction.reply({
      content: 'Here are buttons for you to click:',
      components: [row],
      fetchReply: true
    });
    
    // Create a collector for button interactions
    const collector = response.createMessageComponentCollector({ time: 60000 }); // 60 seconds timeout
    
    // Handle button clicks
    collector.on('collect', async i => {
      if (i.customId === 'click_me_button') {
        // Respond to the button interaction
        await i.reply({ content: 'You clicked the button! 🎉', ephemeral: true });
      } else if (i.customId === 'click_me_2_button') {
        // Create a modal for user input
        const modal = new ModalBuilder()
          .setCustomId('user_input_modal')
          .setTitle('Enter Your Information');
          
        // Create text input components
        const nameInput = new TextInputBuilder()
          .setCustomId('name_input')
          .setLabel('What is your name?')
          .setStyle(TextInputStyle.Short)
          .setRequired(true);
          
        const feedbackInput = new TextInputBuilder()
          .setCustomId('feedback_input')
          .setLabel('Any feedback for us?')
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(false)
          .setPlaceholder('Type your feedback here...');
          
        // Add inputs to the modal
        const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
        const secondActionRow = new ActionRowBuilder().addComponents(feedbackInput);
        modal.addComponents(firstActionRow, secondActionRow);
        
        // Show the modal to the user
        await i.showModal(modal);
        
        // Wait for modal submission (max 2 minutes)
        // If no submission is received before the timeout, the promise will reject
        // but we'll ignore the rejection since we want to do nothing in that case
        const submission = await i.awaitModalSubmit({
          filter: (interaction) => interaction.customId === 'user_input_modal',
          time: 120000 // 2 minutes
        }).catch(() => null); // Catch and do nothing on timeout
        
        // Only process if we got a submission
        if (submission) {
          // Get the data entered by the user
          const name = submission.fields.getTextInputValue('name_input');
          const feedback = submission.fields.getTextInputValue('feedback_input') || 'No feedback provided';
          
          // Respond to the modal submission
          await submission.reply({
            content: `Thank you for your submission, ${name}!\n\n**Your Feedback:**\n${feedback}`,
            ephemeral: true
          });
        }
        // If submission is null (timeout), we do nothing
      }
    });
    
    // Handle collector end
    collector.on('end', collected => {
      // Disable the buttons when the collector ends
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          ButtonBuilder.from(button1).setDisabled(true),
          ButtonBuilder.from(button2).setDisabled(true)
        );
      
      // Update the message with disabled buttons
      interaction.editReply({
        content: 'These buttons are no longer active.',
        components: [disabledRow]
      }).catch(error => console.error('Error updating message:', error));
    });
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
