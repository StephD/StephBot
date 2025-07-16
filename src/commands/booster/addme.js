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
      const successEmbed = new EmbedBuilder()
        .setTitle('Booster Added')
        .setColor(Colors.SUCCESS)
        .setDescription(result.message)
        .addFields(
          { name: 'Discord User', value: `<@${discordId}>`, inline: true },
          { name: 'Nickname', value: nickname, inline: true },
          { name: 'In-Game ID', value: gameId, inline: true },
          { name: 'Booster Status', value: premiumSince ? `Boosting since ${new Date(premiumSince).toLocaleDateString()}` : 'Not boosting', inline: true },
          { name: 'Boost Since', value: premiumSince ? new Date(premiumSince).toLocaleDateString() : 'Unknown', inline: true }
        )
      
      await interaction.editReply({ embeds: [successEmbed] });
    } else {
      const errorEmbed = new EmbedBuilder()
        .setTitle('Error Adding Booster')
        .setColor(Colors.ERROR)
        .setDescription(result.message)
      
      await interaction.editReply({ embeds: [errorEmbed] });
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
