import { EmbedBuilder } from 'discord.js';
import { updateBoostergameId } from '../../supabase/booster.js';

export async function executeUpdateId(interaction, client) {
  try {
    // Get command options
    const gameId = interaction.options.getString('game_id');
    
    // Defer reply as the operation might take time
    await interaction.deferReply();
    
    // Get the Discord user information of the person who invoked the command
    const user = interaction.user;
    const discordId = user.id;
    
    // Use the server nickname if available, otherwise fall back to global username
    const discordName = interaction.member.nickname || user.username;
    
    // Get the GuildMember object to access premium status
    const member = interaction.member;
    const premiumSince = member.premiumSinceTimestamp;
    
    console.log(discordId, discordName, gameId);
    console.log('Premium since timestamp:', premiumSince);
    
    // Call the function to update the booster UID in Supabase
    const result = await updateBoostergameId(discordId, discordName, gameId, premiumSince);
    
    if (result.success) {
      // Create a success embed
      const successEmbed = new EmbedBuilder()
        .setTitle('Booster ID Updated')
        .setColor('#00FF00')
        .setDescription(result.message)
        .addFields(
          { name: 'Discord User', value: `<@${discordId}> (${discordName})`, inline: true },
          { name: 'New In-Game ID', value: gameId, inline: true },
          { name: 'Booster Status', value: premiumSince ? `Boosting since ${new Date(premiumSince).toLocaleDateString()}` : 'Not boosting', inline: true }
        )
        .setTimestamp();
      
      await interaction.editReply({ embeds: [successEmbed] });
    } else {
      // Create an error embed
      const errorEmbed = new EmbedBuilder()
        .setTitle('Error Updating Booster ID')
        .setColor('#FF0000')
        .setDescription(result.message)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  } catch (error) {
    console.error('Error executing booster update-id command:', error);
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(`Error: ${error.message}`);
    } else {
      await interaction.reply({ content: `Error: ${error.message}`, ephemeral: true });
    }
  }
}
