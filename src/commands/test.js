import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Colors } from '../utils/colors.js';
import { callExternalApi, formatApiResponse } from '../utils/api.js';

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

// Export an array of command data objects
// Commands will only be included if we're in development mode
export const data = isDev ? [
  new SlashCommandBuilder()
    .setName('test')
    .setDescription('Testing commands!')
    .addSubcommand(subcommand =>
      subcommand
        .setName('buttons')
        .setDescription('Replies with a button')
    ).addSubcommand(subcommand =>
      subcommand
        .setName('modal')
        .setDescription('Replies with a modal')
  ).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
] : [];

// Execute function that handles both commands
export async function execute(interaction, client) {
  const commandName = interaction.commandName;
  const subcommand = interaction.options.getSubcommand();
  
  // Handle secret command
  if (commandName === 'test') {

    if (subcommand === 'buttons') {
      // Create an embed
      const embed = new EmbedBuilder()
      .setTitle('Interactive Buttons Example')
      .setDescription('This is an example of interactive buttons in Discord. Click the buttons below to see what happens!')
      .setColor(Colors.SUCCESS)
      .addFields(
        { name: 'Button 1', value: 'Click the primary button to see a success message', inline: true },
        { name: 'Button 2', value: 'Click the secondary button to see the embed change', inline: true }
      )
      .setFooter({ text: 'Buttons will become inactive after 1 minute' })
      .setTimestamp();
    
      // Create two buttons with different styles
      const primaryButton = new ButtonBuilder()
        .setCustomId('primary_button')
        .setLabel('Show message')
        .setStyle(ButtonStyle.Primary);
      
      const secondaryButton = new ButtonBuilder()
        .setCustomId('secondary_button')
        .setLabel('Change embed')
        .setStyle(ButtonStyle.Secondary);
      
      // Add the buttons to an action row
      const row = new ActionRowBuilder()
        .addComponents(primaryButton, secondaryButton);
      
      // Send the message with the embed and buttons
      await interaction.reply({
        embeds: [embed],
        components: [row]
      });
      
      // Create a collector for button interactions
      const collector = interaction.channel.createMessageComponentCollector({ 
        filter: i => i.user.id === interaction.user.id && ['primary_button', 'secondary_button'].includes(i.customId),
        time: 10000 // 10 second timeout
      });
      
      // Handle button clicks
      collector.on('collect', async i => {
        try {
          if (i.customId === 'primary_button') {
            // Respond with a success message
            await i.reply({ 
              content: 'You clicked the primary button! This is a success message that only you can see.', 
              // flags: ['Ephemeral'] 
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
          
          // Create a more user-friendly error message with an embed
          const errorEmbed = new EmbedBuilder()
            .setTitle('Something went wrong')
            .setDescription('We encountered an issue while processing your request.')
            .setColor('#FF0000') // Red color for errors
            .addFields({ name: 'What happened?', value: 'The interaction failed to complete properly.' })
            .setFooter({ text: 'Please try again or contact support if the issue persists' })
            // .setTimestamp();
            
          // Try to respond with the error embed
          try {
            // Check if we can reply or need to update
            if (i.deferred) {
              await i.editReply({ embeds: [errorEmbed] }).catch(console.error);
            } else {
              await i.reply({ embeds: [errorEmbed], flags: ['Ephemeral'] }).catch(console.error);
            }
          } catch (followUpError) {
            console.error('Failed to send error message:', followUpError);
          }
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
                  
          // Update the message with disabled buttons and timeout embed
          // Use fetchReply() to check if the message still exists before trying to edit it
          interaction.fetchReply().then(reply => {
            if (reply) {
              interaction.editReply({
                content: 'These buttons are no longer active.',
                components: [disabledRow]
              }).catch(error => {
                // If we can't edit the reply, just log it - don't crash
                console.error('Error updating message after timeout:', error);
              });
            }
          }).catch(error => {
            // If we can't fetch the reply, the message might have been deleted
            console.error('Error fetching reply for timeout handling:', error);
          });
        } catch (error) {
          console.error('Error in collector end handler:', error);
        }
      });
    } else if (subcommand === 'modal') {
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
      await interaction.reply({
        content: 'Here are buttons for you to click (1 minute timeout):',
        components: [row]
      });
      
      // Create a collector for button interactions
      const collector = interaction.channel.createMessageComponentCollector({ 
        filter: i => i.user.id === interaction.user.id && ['click_me_button', 'click_me_2_button'].includes(i.customId),
        time: 10000 // 10 second timeout
      });
      
      // Handle button clicks
      collector.on('collect', async i => {
        if (i.customId === 'click_me_button') {
          await i.reply({ content: 'You clicked the button! 🎉' });
          
        } else if (i.customId === 'click_me_2_button') {
          const modal = new ModalBuilder()
            .setCustomId('user_input_modal')
            .setTitle('Enter Your Information');
            
          // Create text input components
          const nameInput = new TextInputBuilder()
            .setCustomId('name_input')
            .setLabel('What is your name?')
            .setStyle(TextInputStyle.Short)
            .setRequired(true);
            
          // Add inputs to the modal
          const firstActionRow = new ActionRowBuilder().addComponents(nameInput);
          modal.addComponents(firstActionRow);
          
          // Show the modal to the user
          await i.showModal(modal);
          
          // Wait for modal submission (max 2 minutes)
          // If no submission is received before the timeout, the promise will reject 
          const submission = await i.awaitModalSubmit({
            filter: (interaction) => interaction.customId === 'user_input_modal',
            time: 60000 // 1 minute
          }).catch(() => null); // Catch and do nothing on timeout
          
          if (submission) {
            try {
              const name = submission.fields.getTextInputValue('name_input');
               
              await submission.reply({
                content: `Thank you for your submission, ${name}!\n\n`,
              });
            } catch (error) {
              console.error('Error processing modal submission:', error);
              
              // Create a user-friendly error embed
              const errorEmbed = new EmbedBuilder()
                .setTitle('Something went wrong')
                .setDescription('We encountered an issue while processing your submission.')
                .setColor('#FF0000') // Red color
                .setFooter({ text: 'Please try again later' })
                .setTimestamp();
                
              // Try to respond with the error message
              try {
                await submission.reply({ embeds: [errorEmbed] });
              } catch (replyError) {
                console.error('Failed to send error response for modal:', replyError);
              }
            }
          }
          // If submission is null (timeout), we do nothing
        }
      });
      
      // Handle collector end
      collector.on('end', collected => {
        try {
          // Disable the buttons when the collector ends
          const disabledRow = new ActionRowBuilder()
            .addComponents(
              ButtonBuilder.from(button1).setDisabled(true),
              ButtonBuilder.from(button2).setDisabled(true)
            );
          
          // Update the message with disabled buttons and timeout embed
          interaction.fetchReply().then(reply => {
            if (reply) {
              interaction.editReply({
                content: 'These buttons are no longer active.',
                components: [disabledRow]
              }).catch(error => {
                // If we can't edit the reply, just log it - don't crash
                console.error('Error updating message after timeout:', error);
              });
            }
          }).catch(error => {
            // If we can't fetch the reply, the message might have been deleted
            console.error('Error fetching reply for timeout handling:', error);
          });
        } catch (error) {
          console.error('Error in collector end handler:', error);
        }
      });
    }
  }
}
