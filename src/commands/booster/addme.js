import { EmbedBuilder, ApplicationCommandOptionType } from 'discord.js';
import { updateBoosterGameId } from '../../supabase/booster.js';

export async function executeAddMe(interaction, client) {
  try {
    // Get the game ID from the command options
    const gameId = interaction.options.getString('game_id');
    
    // Defer reply as the operation might take time
    await interaction.deferReply();
    
    // Get the Discord user information
    const user = interaction.user;
    const discordId = user.id;
    const discordName = user.username;
    
    // Get the GuildMember object to access nickname and premium status
    const member = interaction.member;
    const nickname = user.globalName || discordName;
    const premiumSince = member.premiumSinceTimestamp;
    
    console.log(`Adding booster: ${discordId}, ${discordName}, ${gameId}, ${premiumSince}, ${nickname}`);
    
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
        .setColor('#00FF00')
        .setDescription(result.message)
        .addFields(
          { name: 'Discord User', value: `<@${discordId}> (${discordName})`, inline: true },
          { name: 'Nickname', value: nickname, inline: true },
          { name: 'In-Game ID', value: gameId, inline: true },
          { name: 'Booster Status', value: premiumSince ? `Boosting since ${new Date(premiumSince).toLocaleDateString()}` : 'Not boosting', inline: true } 
        )
        .setTimestamp();
      
      await interaction.editReply({ embeds: [successEmbed] });
    } else {
      // Create an error embed
      const errorEmbed = new EmbedBuilder()
        .setTitle('Error Adding Booster')
        .setColor('#FF0000')
        .setDescription(result.message)
        .setTimestamp();
      
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  } catch (error) {
    console.error('Error executing booster addme command:', error);
    
    // Handle errors appropriately
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply(`Error: ${error.message}`);
    } else {
      await interaction.reply({ content: `Error: ${error.message}`, ephemeral: true });
    }
  }
}
