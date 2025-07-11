import { EmbedBuilder } from 'discord.js';
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
    const nickname = user.globalName || 'None';
    const premiumSince = member.premiumSinceTimestamp;
    const isPremium = !!premiumSince;
    
    // Get user roles
    const roles = member.roles.cache
      .sort((a, b) => b.position - a.position) // Sort by position (highest first)
      .map(role => ({ 
        id: role.id, 
        name: role.name,
        color: role.hexColor,
        position: role.position 
      }))
      .filter(role => role.name !== '@everyone'); // Filter out @everyone role
    
    // Get booster data from Supabase
    const result = await getBoosterByDiscordId(discordId);
    
    // Create embed
    const embed = new EmbedBuilder()
      .setTitle('Your Booster Information')
      .setColor(isPremium ? '#f47fff' : '#5865F2') // Pink for premium, Discord blue for non-premium
      .addFields(
        { name: 'Discord User', value: `<@${discordId}>`, inline: true },
        { name: 'Username', value: discordName, inline: true },
        { name: 'Nickname', value: nickname, inline: true },
        { name: 'Discord ID', value: discordId, inline: false },
        { name: 'Booster Status', value: isPremium ? `Boosting since ${new Date(premiumSince).toLocaleDateString()}` : 'Not boosting', inline: false }
      )
      .setTimestamp();
    
    // Add roles information
    if (roles.length > 0) {
      // Format roles with their IDs
      const rolesList = roles.map(role => `<@&${role.id}> (${role.name}) - ID: ${role.id}`).join('\n');
      embed.addFields({ name: '🛡️ Roles', value: rolesList || 'No roles', inline: false });
    } else {
      embed.addFields({ name: '🛡️ Roles', value: 'No roles', inline: false });
    }
    
    // Add database information if available
    if (result.success && result.data) {
      embed.addFields(
        { name: '📊 Database Information', value: '─────────────────', inline: false },
        { name: 'Game ID', value: result.data.game_id || 'Not set', inline: true },
        { name: 'First Registered', value: result.data.created_at ? new Date(result.data.created_at).toLocaleDateString() : 'Unknown', inline: true },
        { name: 'Last Updated', value: result.data.updated_at ? new Date(result.data.updated_at).toLocaleDateString() : 'Unknown', inline: true }
      );
    } else {
      embed.addFields(
        { name: '📊 Database Information', value: 'No records found in database. Use `/booster_admin update-id` to register.', inline: false }
      );
    }
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error executing booster me command:', error);
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(`Error: ${error.message}`);
    } else {
      await interaction.reply({ content: `Error: ${error.message}`, ephemeral: true });
    }
  }
}
