import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getBoosterByDiscordId } from '../../supabase/booster.js';

export async function executeMe(interaction, client) {
  try {
    // Defer reply as the operation might take time
    await interaction.deferReply({ flags: ['Ephemeral'] });
    
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
        { name: 'Discord User', value: `<@${discordId}> (${discordId})`, inline: true },
        { name: 'Username', value: discordName, inline: true },
        { name: 'Nickname', value: nickname, inline: true },
        { name: 'Booster Status', value: isPremium ? `Boosting since ${new Date(premiumSince).toLocaleDateString()}` : 'Not boosting', inline: false }
      )
      .setTimestamp();
    
    // Add roles information
    if (roles.length > 0) {
      // Format roles with their IDs
      const rolesList = roles.map(role => `<@&${role.id}>`).join('\n');
      embed.addFields({ name: '🛡️ Roles', value: rolesList || 'No roles', inline: false });
    } else {
      embed.addFields({ name: '🛡️ Roles', value: 'No roles', inline: false });
    }
    
    // Add database information if available
    if (result.success && result.data) {
      embed.addFields(
        { name: '\n', value: '\n', inline: false },
        { name: '📊 Database Information', value: '─────────────────', inline: false },
        { name: 'Game ID', value: result.data.game_id || 'Not set', inline: true },
        { name: 'Booster Since', value: result.data.premium_since ? new Date(result.data.premium_since).toLocaleDateString() : 'Unknown', inline: true },
        { name: 'Last Updated', value: result.data.updated_at ? new Date(result.data.updated_at).toLocaleDateString() : 'Unknown', inline: true }
      );
    } else {
      embed.addFields(
        { name: '📊 Database Information', value: 'No records found in database. Use `/booster_admin update-id` to register.', inline: false }
      );
    }
    
    // Create buttons for additional actions
    /*const updateButton = new ButtonBuilder()
      .setCustomId('update_game_id')
      .setLabel('Update Game ID')
      .setStyle(ButtonStyle.Primary);
      
    const refreshButton = new ButtonBuilder()
      .setCustomId('refresh_profile')
      .setLabel('Refresh Profile')
      .setStyle(ButtonStyle.Secondary);
    
    // Add buttons to an action row
    const row = new ActionRowBuilder()
      .addComponents(updateButton, refreshButton);
      */
    // Send the message with the embed and buttons
    await interaction.editReply({ 
      embeds: [embed]
      // No components since buttons are commented out
    });
    
    // Create a collector for button interactions
    // const collector = response.createMessageComponentCollector({ time: 300000 }); // 5 minutes timeout
    
    /* // Handle button clicks
    collector.on('collect', async i => {
      // Verify that the user who clicked is the same who ran the command
      if (i.user.id !== interaction.user.id) {
        await i.reply({ content: 'This button is not for you!', flags: ['Ephemeral'] });
        return;
      }
      
      if (i.customId === 'update_game_id') {
        // Prompt the user to use the addme command
        await i.reply({ 
          content: 'To update your game ID, please use the `/booster addme` command with your 28-character game ID.', 
          flags: ['Ephemeral'] 
        });
      } else if (i.customId === 'refresh_profile') {
        // Acknowledge the button click
        await i.deferUpdate();
        
        try {
          // Fetch fresh data
          const freshResult = await getBoosterByDiscordId(discordId);
          
          // Update the embed with fresh data
          if (freshResult.success && freshResult.data) {
            embed.spliceFields(embed.data.fields.length - 3, 3,
              { name: '📊 Database Information', value: '─────────────────', inline: false },
              { name: 'Game ID', value: freshResult.data.game_id || 'Not set', inline: true },
              { name: 'First Registered', value: freshResult.data.created_at ? new Date(freshResult.data.created_at).toLocaleDateString() : 'Unknown', inline: true },
              { name: 'Last Updated', value: freshResult.data.updated_at ? new Date(freshResult.data.updated_at).toLocaleDateString() : 'Unknown', inline: true }
            );
          }
          
          // Update timestamp
          embed.setTimestamp();
          
          // Update the message
          await i.editReply({ embeds: [embed] });
        } catch (error) {
          console.error('Error refreshing profile:', error);
          await i.followUp({ content: `Error refreshing profile: ${error.message}`, flags: ['Ephemeral'] });
        }
      }
    });
    */
    
    // Handle collector end
    /*collector.on('end', collected => {
      // Disable the buttons when the collector ends
      const disabledRow = new ActionRowBuilder()
        .addComponents(
          ButtonBuilder.from(updateButton).setDisabled(true),
          ButtonBuilder.from(refreshButton).setDisabled(true)
        );
      
      // Update the message with disabled buttons
      interaction.editReply({
        embeds: [embed],
        components: [disabledRow]
      }).catch(error => console.error('Error updating message:', error));
    });*/
  } catch (error) {
    console.error('Error executing booster me command:', error);
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(`Error: ${error.message}`);
    } else {
      await interaction.reply({ content: `Error: ${error.message}`, flags: ['Ephemeral'] });
    }
  }
}
