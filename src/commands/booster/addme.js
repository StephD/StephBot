import { EmbedBuilder, ApplicationCommandOptionType } from 'discord.js';
import { updateBoosterGameId } from '../../supabase/booster.js';
import { Colors } from '../../utils/colors.js';

export async function executeAddMe(interaction, client) {
  try {
    // Get the game ID from the command options
    const gameId = interaction.options.getString('game_id');
    
    // Validate game_id: must be exactly 28 characters and contain only letters and numbers
    if (!gameId || gameId.length !== 28 || !/^[a-zA-Z0-9]+$/.test(gameId)) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('Error Adding Booster')
        .setColor(Colors.ERROR)
        .setDescription('Invalid game ID. The game ID must be exactly 28 characters long and contain only letters and numbers.')
        .setTimestamp();
      return interaction.reply({
        embeds: [errorEmbed],
      });
    }
    
    // Defer reply as the operation might take time
    await interaction.deferReply({ flags: ['Ephemeral'] });
    
    // Get the Discord user information
    const user = interaction.user;
    const discordId = user.id;
    const discordName = user.username;
    
    // Get the GuildMember object to access nickname and premium status
    const member = interaction.member;
    const nickname = user.globalName || discordName;
    const premiumSince = member?.premiumSinceTimestamp || null;
    
    // Determine if the interaction is from a DM
    const isDM = !interaction.guild;
    
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
    
    // Call the function to create/update the booster in Supabase
    // If in a DM, we'll pass null for premiumSince to avoid updating premium status
    const result = await updateBoosterGameId(
      discordId,
      discordName,
      gameId,
      premiumSince, // Only pass premiumSince if not in a DM
      nickname, // Pass the nickname as the discordNickname parameter
      isDM
    );
    
    // Get the booster data from the result instead of making another database call
    const boosterData = result.data;
    const dbBoostingStatus = boosterData?.active 
      ? `✅ Boosting since ${new Date(boosterData.premium_since).toLocaleDateString()}` 
      : '❌ Not boosting';
    
    const discordBoostingStatus = isDM ? '❓ I cannot check your boost status in DMs' : premiumSince ? `✅ Boosting since ${new Date(premiumSince).toLocaleDateString()}` : '❌ Not currently boosting';
    
    if (result.success) {
      const successEmbed = new EmbedBuilder()
        .setTitle('Booster Added')
        .setColor(Colors.SUCCESS)
        .setDescription(result.message)
        .addFields(
          { name: 'Discord User', value: `<@${discordId}>`, inline: true },
          { name: 'In-Game ID', value: gameId, inline: true },
          { name: 'Boosting Status', value: discordBoostingStatus },
          // { name: 'Database Status', value: dbBoostingStatus }
        )
      
      await interaction.editReply({ embeds: [successEmbed] });
      
      // Send a nice embed to the booster-log channel
      if (botLogChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(Colors.BOOSTER)
          .setTitle(`💎 Booster Game ID Added from ${isDM ? 'DM' : 'Server'}`)
          .setDescription(`**${nickname}** has added their game ID using the **/booster addme** command`)
          .addFields(
            { name: 'User', value: `<@${discordId}> (${discordName})`, inline: true },
            { name: 'In-Game ID', value: gameId, inline: true },
            { name: 'Boosting Status', value: isDM ? '❓ I cannot check your boost status in DMs' : premiumSince ? `✅ Boosting since <t:${Math.floor(premiumSince/1000)}:R>` : '❌ Not currently boosting' },
            { name: 'Database Status', value: isDM ? '✅ Game ID updated (premium status preserved)' : '✅ All data updated', inline: true },
            { name: 'Current DB Status', value: dbBoostingStatus, inline: true }
          )
          .setFooter({ text: 'Booster database updated successfully' })
          .setTimestamp();
        
        await botLogChannel.send({ embeds: [logEmbed] });
      }
    } else {
      const errorEmbed = new EmbedBuilder()
        .setTitle(`Error Adding Booster from ${isDM ? 'DM' : 'Server'}`)
        .setColor(Colors.ERROR)
        .setDescription(result.message)
      
      await interaction.editReply({ embeds: [errorEmbed] });
      
      // Send an error embed to the booster-log channel
      if (botLogChannel) {
        const errorLogEmbed = new EmbedBuilder()
          .setColor(Colors.ERROR)
          .setTitle(`❌ Booster Game ID Error from ${isDM ? 'DM' : 'Server'}`)
          .setDescription(`Failed to add game ID for **${nickname}** using the **/booster addme** command`)
          .addFields(
            { name: 'User', value: `<@${discordId}> (${discordName})`, inline: true },
            { name: 'Attempted Game ID', value: gameId, inline: true },
            { name: 'Boosting Status', value: isDM ? '❓ I cannot check your boost status in DMs' : premiumSince ? `✅ Boosting since <t:${Math.floor(premiumSince/1000)}:R>` : '❌ Not currently boosting', inline: true },
            { name: 'Database Status', value: dbBoostingStatus, inline: true },
            { name: 'Error', value: result.message, inline: false }
          )
          .setFooter({ text: 'Database operation failed' })
          .setTimestamp();
        
        await botLogChannel.send({ embeds: [errorLogEmbed] });
      }
    }
  } catch (error) {
    console.error('Error executing booster addme command:', error);
    
    // Handle errors appropriately
    try {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(`Error: ${error.message}`);
      } else {
        await interaction.reply({ 
          content: `Error: ${error.message}` 
        });
      }
    } catch (responseError) {
      console.error('Error sending error response:', responseError);
    }
  }
}
