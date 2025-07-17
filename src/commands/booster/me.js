import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getBoosterByDiscordId } from '../../supabase/booster.js';

export async function executeMe(interaction, client) {
  try {
    // Defer reply as the operation might take time
    await interaction.deferReply();
    
    // Get user information
    const user = interaction.user;
    const discordId = user.id;
    const discordName = user.username;
    
    // Get the GuildMember object to access roles and premium status
    const member = interaction.member;
    const premiumSince = member?.premiumSinceTimestamp || null;
    const isPremium = !!premiumSince;
    
    // Get booster data from Supabase
    const result = await getBoosterByDiscordId(discordId);
    
    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('Your Booster Information')
      .setColor(isPremium ? '#f47fff' : '#5865F2') // Pink for premium, Discord blue for non-premium
      .addFields(
        { name: 'Discord User', value: `<@${discordId}> (${discordId})`, inline: true },
        { name: 'Username', value: discordName, inline: true },
        { name: 'Booster Status', value: isPremium ? `Boosting since ${new Date(premiumSince).toLocaleDateString()}` : 'Not boosting', inline: true }
      )
      .setTimestamp();
    
    // Add database information if available
    if (result.success && result.data) {
      embed.addFields(
        { name: '\n', value: '\n', inline: false },
        { name: '📊 Database Information', value: '─────────────────', inline: false },
        { name: 'Game ID', value: result.data.game_id || 'Not set', inline: true },
        { name: 'Booster Since', value: result.data.premium_since ? new Date(result.data.premium_since).toLocaleDateString() : 'Unknown', inline: true }
      );
    } else {
      embed.addFields(
        { name: '📊 Database Information', value: 'No records found in database. Use `/booster addme` to register.', inline: false }
      );
    }

    // Send the message with the embed and buttons
    await interaction.editReply({ 
      embeds: [embed]
    });
  } catch (error) {
    console.error('Error executing booster me command:', error);
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(`Error: ${error.message}`);
    } else {
      await interaction.reply({ content: `Error: ${error.message}` });
    }
  }
}
