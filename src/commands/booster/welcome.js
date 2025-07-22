import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Colors } from '../../utils/colors.js';
import { executeMe } from './me.js';
import { updateBoosterGameId } from '../../supabase/booster.js';

// Process the game ID from the modal submission
async function processGameIdFromModal(interaction, gameId, client) {
  try {
    // Modal submissions are already acknowledged when the modal is submitted
    // No need to defer reply here
    await interaction.deferReply({ flags: ['Ephemeral'] });
    
    // Get the Discord user information
    const user = interaction.user;
    const discordId = user.id;
    const discordName = user.username;
    
    // Get the GuildMember object to access nickname and premium status
    const member = interaction.member;
    const nickname = user.globalName || discordName;
    const premiumSince = member ? member.premiumSinceTimestamp : null;
    
    console.log(`Adding booster from modal: ${discordId}, ${discordName}, ${gameId}, ${premiumSince}, ${nickname}`);
    
    // Call the function to create/update the booster in Supabase
    const result = await updateBoosterGameId(
      discordId,
      discordName,
      gameId,
      premiumSince,
      nickname // Pass the nickname as the discordNickname parameter
    );
    
    if (result.success) {
      // Create a success embed
      const successEmbed = new EmbedBuilder()
        .setTitle('Booster Added')
        .setColor(Colors.SUCCESS)
        .setDescription(result.message)
        .addFields(
          { name: 'Discord User', value: `<@${discordId}> (${discordName})`, inline: true },
          { name: 'Nickname', value: nickname, inline: true },
          { name: 'In-Game ID', value: gameId, inline: true },
          { name: 'Booster Status', value: premiumSince ? `Boosting since ${new Date(premiumSince).toLocaleDateString()}` : 'Not boosting', inline: true } 
        )
        .setTimestamp();
      
      // Send the success embed as a reply
      await interaction.editReply({ embeds: [successEmbed] });

      // Send a message to the booster log channel
      // bot log channel
      let botLogChannel = null;
      
      // Check if the interaction is from a guild or DM
      if (interaction.guild) {
        // If in a guild, find the booster-log channel in that guild
        botLogChannel = interaction.guild.channels.cache.find(channel => channel.name === 'booster-log');
      } else {
        // If in a DM, search all guilds the bot is in to find a booster-log channel
        try {
          for (const guild of client.guilds.cache.values()) {
            const foundChannel = guild.channels.cache.find(channel => 
              channel.name === 'booster-log' && 
              channel.permissionsFor(client.user).has(['ViewChannel', 'SendMessages'])
            );
            
            if (foundChannel) {
              botLogChannel = foundChannel;
              break; // Stop searching once we find a suitable channel
            }
          }
        } catch (error) {
          console.error('Error finding booster log channel:', error.message);
        }
      }
      // Send a nice embed to the booster-log channel
      if (botLogChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(Colors.BOOSTER)
          .setTitle('💎 Booster Game ID Added')
          .setDescription(`**${nickname}** added their game ID using the **/booster welcome** command`)
          .addFields(
            { name: 'User', value: `<@${discordId}> (${discordName})`, inline: true },
            { name: 'Nickname', value: nickname, inline: true },
            { name: 'In-Game ID', value: gameId, inline: true },
            { name: 'Booster Status', value: premiumSince ? `✅ Boosting since <t:${Math.floor(premiumSince/1000)}:R>` : '❌ Not currently boosting', inline: true },
            { name: 'Database Status', value: '✅ Successfully added to database', inline: true }
          )
          .setFooter({ text: 'Booster database updated successfully' })
          .setTimestamp();
        
        await botLogChannel.send({ embeds: [logEmbed] });
      }
    } else {
      // Create an error embed
      const errorEmbed = new EmbedBuilder()
        .setTitle('Error Adding Booster')
        .setColor(Colors.ERROR)
        .setDescription(result.message)
        .setTimestamp();
      
      // Send the error embed as a reply
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  } catch (error) {
    console.error('Error processing game ID from modal:', error);
    
    try {
      // Handle errors appropriately - for modal submissions, just use reply
      await interaction.editReply({ 
        content: `Error: ${error.message}`, 
        // Keep the error message visible to everyone
        flags: ['Ephemeral']
      });
    } catch (responseError) {
      console.error('Error sending error response:', responseError);
    }
  }
}

export async function executeWelcome(interaction, client) {
  try {
    // Create an embed message
    const embed = new EmbedBuilder()
      .setTitle('Thank you, Guardian, for supporting our server! 💖')
      .setDescription('Use the commands below to register your game ID so we can send you the monthly perk or to check your booster status.')
      .setColor(Colors.SUCCESS)
      .addFields(
        { name: 'My Status', value: 'Click the "My Status" button to view your current booster information.', inline: true },
        { name: 'Add me', value: 'Click the "Add me" button to register your game ID.', inline: true }
      )
      .setFooter({ text: 'Thank you for your support!' })
      .setTimestamp();
    
    // Create buttons
    const meButton = new ButtonBuilder()
      .setCustomId('welcome_me_button')
      .setLabel('My Status')
      .setStyle(ButtonStyle.Primary);
    
    const addMeButton = new ButtonBuilder()
      .setCustomId('welcome_addme_button')
      .setLabel('Add me')
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
    // Can add time here if we want
    // Max 24h from discord limits
    const collector = interaction.channel.createMessageComponentCollector({
      filter: i => i.user.id === interaction.user.id && ['welcome_me_button', 'welcome_addme_button'].includes(i.customId),
      time: 60000 // 1 minute timeout
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
        
        // Handle modal submission directly with a once event listener
        // This ensures each modal submission is handled independently
        // and tied to the specific user who clicked the button
        client.once('interactionCreate', async (submission) => {
          // Only process this modal if it's from the same user who clicked the button
          // This prevents conflicts when multiple users submit modals
          if (submission.isModalSubmit() && 
              submission.customId === 'game_id_modal' && 
              submission.user.id === i.user.id) {
            const gameId = submission.fields.getTextInputValue('game_id_input');
            
            // Validate game_id: must be exactly 28 characters and contain only letters and numbers
            if (!gameId || gameId.length !== 28 || !/^[a-zA-Z0-9]+$/.test(gameId)) {
              const errorEmbed = new EmbedBuilder()
                .setTitle('Error Adding Booster')
                .setColor(Colors.ERROR)
                .setDescription('Invalid game ID. The game ID must be exactly 28 characters long and contain only letters and numbers.')
                .setTimestamp();
              
              await submission.editReply({
                embeds: [errorEmbed]
              });
              return;
            }
            
            // Process the game ID directly here instead of using the addme command
            await processGameIdFromModal(submission, gameId, client);
          }
        });
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
        
        // Update the message with disabled buttons and updated embed
        // Use fetchReply() to check if the message still exists before trying to edit it
        interaction.fetchReply().then(reply => {
          if (reply) {
            interaction.editReply({
              content: 'These buttons are no longer active.',
              components: [disabledRow]
            }).catch(error => {
              // If we can't edit the reply, just log it - don't crash
              console.error('Error updating welcome message after timeout:', error);
            });
          }
        }).catch(error => {
          // If we can't fetch the reply, the message might have been deleted
          console.error('Error fetching welcome message for timeout handling:', error);
        });
      } catch (error) {
        console.error('Error in collector end handler:', error);
      }
    });
  } catch (error) {
    console.error('Error executing booster welcome command:', error);
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(`Error: ${error.message}`);
    } else {
      await interaction.reply({ content: `Error: ${error.message}`, flags: [''] });
    }
  }
}
