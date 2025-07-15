import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Colors } from '../../utils/colors.js';
import { executeMe } from './me.js';
import { executeAddMe } from './addme.js';

export async function executeWelcome(interaction, client) {
  try {
    // Create an embed message
    const embed = new EmbedBuilder()
      .setTitle('Welcome to the Booster Channel!')
      .setDescription('Thank you for supporting our server! Please let us know your game ID or check your current status.')
      .setColor(Colors.SUCCESS)
      .addFields(
        { name: 'Check Status', value: 'Click the "Me" button to view your current booster information.', inline: true },
        { name: 'Register Game ID', value: 'Click the "Add Me" button to register your game ID.', inline: true }
      )
      .setFooter({ text: 'Thank you for your support!' })
      .setTimestamp();
    
    // Create buttons
    const meButton = new ButtonBuilder()
      .setCustomId('welcome_me_button')
      .setLabel('Me')
      .setStyle(ButtonStyle.Primary);
    
    const addMeButton = new ButtonBuilder()
      .setCustomId('welcome_addme_button')
      .setLabel('Add Me')
      .setStyle(ButtonStyle.Success);
    
    // Add buttons to an action row
    const row = new ActionRowBuilder()
      .addComponents(meButton, addMeButton);
    
    // Send the message with the embed and buttons
    await interaction.reply({
      embeds: [embed],
      components: [row]
    });
    
    // Create a collector for button interactions
    const collector = interaction.channel.createMessageComponentCollector({ 
      filter: i => ['welcome_me_button', 'welcome_addme_button'].includes(i.customId),
      time: 7*24*60*60*1000 // 7 days timeout
    });
    
    // Handle button clicks
    collector.on('collect', async i => {
      if (i.customId === 'welcome_me_button') {
        // Call the me command functionality
        await executeMe(i, client);
      } 
      else if (i.customId === 'welcome_addme_button') {
        // Create a modal for game ID input
        const modal = new ModalBuilder()
          .setCustomId('game_id_modal')
          .setTitle('Enter Your Game ID');
        
        // Create text input for game ID
        const gameIdInput = new TextInputBuilder()
          .setCustomId('game_id_input')
          .setLabel('Game ID')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('28 characters, letters and numbers only')
          .setRequired(true)
          .setMinLength(28)
          .setMaxLength(28);

        // Add input to the modal
        const firstActionRow = new ActionRowBuilder().addComponents(gameIdInput);
        modal.addComponents(firstActionRow);
        
        // Show the modal to the user
        await i.showModal(modal);
        
        // Wait for modal submission
        const submission = await i.awaitModalSubmit({
          filter: (interaction) => interaction.customId === 'game_id_modal',
          time: 300000 // 5 minutes
        }).catch(() => null);
        
        // Process the submission
        if (submission) {
          // Get the game ID from the modal
          const gameId = submission.fields.getTextInputValue('game_id_input');
          
          // Validate game_id: must be exactly 28 characters and contain only letters and numbers
          if (!gameId || gameId.length !== 28 || !/^[a-zA-Z0-9]+$/.test(gameId)) {
            const errorEmbed = new EmbedBuilder()
              .setTitle('Error Adding Booster')
              .setColor(Colors.ERROR)
              .setDescription('Invalid game ID. The game ID must be exactly 28 characters long and contain only letters and numbers.')
              .setTimestamp();
            
            await submission.reply({
              embeds: [errorEmbed],
              flags: ['Ephemeral']
            });
            return;
          }
          
          // Create a synthetic interaction object with the necessary properties
          const syntheticInteraction = {
            ...submission,
            // Ensure user information is properly passed
            interaction: submission,
            gameId: gameId,
            // user: submission.user,
            // member: submission.member,
            // guild: submission.guild,
            options: {
              getString: () => gameId
            }
          };
          
          // First acknowledge the modal submission to prevent InteractionNotReplied error
          await submission.deferReply({ ephemeral: true });
          
          // Call the addme command functionality with the synthetic interaction
          await executeAddMe(syntheticInteraction, client);
        }
      }
    });
    
    // Handle collector end
    collector.on('end', collected => {
      try {
        // Disable the buttons when the collector ends
        const disabledRow = new ActionRowBuilder()
          .addComponents(
            ButtonBuilder.from(meButton).setDisabled(true),
            ButtonBuilder.from(addMeButton).setDisabled(true)
          );
        
        // Update the message with disabled buttons
        interaction.editReply({
          content: 'This welcome message is no longer active.',
          embeds: [embed],
          components: [disabledRow]
        }).catch(error => console.error('Error updating welcome message:', error));
      } catch (error) {
        console.error('Error in collector end handler:', error);
      }
    });
  } catch (error) {
    console.error('Error executing booster welcome command:', error);
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(`Error: ${error.message}`);
    } else {
      await interaction.reply({ content: `Error: ${error.message}`, flags: ['Ephemeral'] });
    }
  }
}
