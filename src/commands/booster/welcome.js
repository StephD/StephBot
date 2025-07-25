import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { Colors } from '../../utils/colors.js';
import { executeMe } from './me.js';
import { updateBoosterGameId } from '../../supabase/booster.js';

const isDev = process.env.NODE_ENV === 'development';

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
    
    if (isDev) {
      console.log(`Adding booster from modal: ${discordId}, ${discordName}, ${gameId}, ${premiumSince}, ${nickname}`);
    }
    
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
          // { name: 'Nickname', value: nickname, inline: true },
          { name: 'In-Game ID', value: gameId, inline: true },
          { name: 'Booster Status', value: premiumSince ? `✅ Boosting since ${new Date(premiumSince).toLocaleDateString()}` : '❌ Not currently boosting' }
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
            // { name: 'Nickname', value: nickname, inline: true },
            { name: 'In-Game ID', value: gameId, inline: true },
            { name: 'Booster Status', value: premiumSince ? `✅ Boosting since <t:${Math.floor(premiumSince/1000)}:R>` : '❌ Not currently boosting'},
            { name: 'Database Status', value: '✅ Successfully added', inline: true }
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
    // Handle different types of interactions
    if (interaction.isChatInputCommand()) {
      // This is the initial slash command - create the permanent message
      await createWelcomeMessage(interaction);
    } else if (interaction.isButton()) {
      // Handle button interactions
      await handleWelcomeButton(interaction, client);
    } else if (interaction.isModalSubmit()) {
      // Handle modal submissions
      await handleWelcomeModal(interaction, client);
    }
  } catch (error) {
    console.error('Error executing booster welcome command:', error);
    
    const errorReply = { content: `Error: ${error.message}`, flags: ['Ephemeral'] };
    
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp(errorReply);
    } else {
      await interaction.reply(errorReply);
    }
  }
}

// Create the initial welcome message with permanent buttons
async function createWelcomeMessage(interaction) {
  // Create an embed message
  const embed = new EmbedBuilder()
    .setTitle('Thank you, Guardians, for supporting our server! 💖')
    .setDescription('Use the commands below to register your game ID so we can send you the monthly perk or to check your booster status.')
    .setColor(Colors.SUCCESS)
    .addFields(
      { name: 'My Status', value: 'Click the "My Status" button to view your current booster information.', inline: true },
      { name: 'Add me', value: 'Click the "Add me" button to register your game ID.', inline: true }
    )
    .setFooter({ text: 'Thank you for your support! These buttons will work permanently.' })
    .setTimestamp();
  
  // Create permanent buttons (no collectors needed!)
  const meButton = new ButtonBuilder()
    .setCustomId('booster_welcome_me')
    .setLabel('My Status')
    .setStyle(ButtonStyle.Primary);
  
  const addMeButton = new ButtonBuilder()
    .setCustomId('booster_welcome_addme')
    .setLabel('Add me')
    .setStyle(ButtonStyle.Success);
  
  // Add buttons to an action row
  const row = new ActionRowBuilder()
    .addComponents(meButton, addMeButton);
  
  // Send the message with the embed and permanent buttons
  await interaction.reply({
    embeds: [embed],
    components: [row]
  });
}

// Handle button interactions for welcome command
async function handleWelcomeButton(interaction, client) {
  if (interaction.customId === 'booster_welcome_me') {
    // Call the me command functionality
    await executeMe(interaction, client);
  } else if (interaction.customId === 'booster_welcome_addme') {
    // Create a modal for game ID input
    const modal = new ModalBuilder()
      .setCustomId('booster_gameIdModal')
      .setTitle('Enter Your Game ID');
    
    // Create text input for game ID
    const gameIdInput = new TextInputBuilder()
      .setCustomId('booster_game_id_input')
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
    await interaction.showModal(modal);
  }
}

// Handle modal submissions for welcome command
async function handleWelcomeModal(interaction, client) {
  if (interaction.customId === 'booster_gameIdModal') {
    const gameId = interaction.fields.getTextInputValue('booster_game_id_input');
    
    // Validate game_id: must be exactly 28 characters and contain only letters and numbers
    if (!gameId || gameId.length !== 28 || !/^[a-zA-Z0-9]+$/.test(gameId)) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('Error Adding Booster')
        .setColor(Colors.ERROR)
        .setDescription('Invalid game ID. The game ID must be exactly 28 characters long and contain only letters and numbers.')
        .setTimestamp();
      
      await interaction.reply({
        embeds: [errorEmbed],
        flags: ['Ephemeral']
      });
      return;
    }
    
    // Process the game ID
    await processGameIdFromModal(interaction, gameId, client);
  }
}
