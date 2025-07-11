import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

// Define the command data using SlashCommandBuilder
export const data = new SlashCommandBuilder()
  .setName('booster')
  .setDescription('Commands for managing boosters')
  .addSubcommand(subcommand =>
    subcommand
      .setName('update-id')
      .setDescription('Update your in-game ID')
      .addStringOption(option =>
        option
          .setName('ig_id')
          .setDescription('Your new in-game ID')
          .setRequired(true)
      )
  );

/**
 * Updates a booster's UID in the system
 * @param {string} discordId - The Discord ID of the user
 * @param {string} discordName - The Discord username
 * @param {string} igId - The new in-game ID
 * @param {number|null} premiumSince - Timestamp when the user started boosting or null if not boosting
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function updateBoosterUid(discordId, discordName, igId, premiumSince) {
  try {
    // This is where you would implement the actual update logic
    // For example, updating a database record, calling an external API, etc.
    
    // For now, we'll just return a success message
    console.log(`Updating booster UID for ${discordName} (${discordId}) to ${igId}`);
    console.log(`Premium since: ${premiumSince ? new Date(premiumSince).toISOString() : 'Not a booster'}`);
    
    // TODO: Implement the actual update logic here
    // Example: await database.updateBooster(discordId, igId);
    
    return { 
      success: true, 
      message: `Successfully updated in-game ID for ${discordName} to ${igId}`
    };
  } catch (error) {
    console.error('Error updating booster UID:', error);
    return { 
      success: false, 
      message: `Failed to update in-game ID: ${error.message}`
    };
  }
}

export async function execute(interaction, client) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'update-id') {
    // Get command options
    const igId = interaction.options.getString('ig_id');
    
    try {
      // Defer reply as the operation might take time
      await interaction.deferReply();
      
      // Get the Discord username of the person who invoked the command
      const user = interaction.user;
      const discordName = user.username;
      const discordId = user.id;
      
      // Get the GuildMember object to access premium status
      const member = interaction.member;
      const premiumSince = member.premiumSinceTimestamp;
      
      console.log(discordId, discordName, igId);
      console.log('Premium since timestamp:', premiumSince);
      
      // Call the function to update the booster UID
      const result = await updateBoosterUid(discordId, discordName, igId, premiumSince);
      
      if (result.success) {
        // Create a success embed
        const successEmbed = new EmbedBuilder()
          .setTitle('Booster ID Updated')
          .setColor('#00FF00')
          .setDescription(result.message)
          .addFields(
            { name: 'Discord User', value: `<@${discordId}> (${discordName})`, inline: true },
            { name: 'New In-Game ID', value: igId, inline: true },
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
}
