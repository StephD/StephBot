import { EmbedBuilder } from 'discord.js';

export async function executeDiscordList(interaction, client) {
  try {
    // Defer reply as fetching members might take time
    await interaction.deferReply();
    
    // Get the premium_subscribers role (server boosters)
    const premiumRole = interaction.guild.roles.premiumSubscriberRole;
    
    if (!premiumRole) {
      return interaction.editReply('This server does not have any boosters or the premium subscribers role could not be found.');
    }
    
    console.log(`Fetching boosters for server: ${interaction.guild.name}`);
    
    // Fetch all guild members
    const members = await interaction.guild.members.fetch();
    
    // Filter for members with the premium subscriber role
    const boosters = members.filter(member => member.roles.cache.has(premiumRole.id));
    
    if (boosters.size === 0) {
      return interaction.editReply('This server does not have any boosters currently.');
    }
    
    // Create an embed to display the boosters
    const embed = new EmbedBuilder()
      .setTitle(`Server Boosters (${boosters.size})`)
      .setColor('#f47fff') // Discord Nitro pink color
      .setDescription(
        boosters.map(member => {
          const displayName = member.nickname || member.user.username;
          return `• ${displayName} (${member.user.username}) - Boosting since ${member.premiumSince ? new Date(member.premiumSince).toLocaleDateString() : 'Unknown'}`;
        }).join('\n').substring(0, 4096) // Ensure description doesn't exceed Discord's limit
      )
      .setFooter({
        text: `Total: ${boosters.size} booster${boosters.size !== 1 ? 's' : ''}`
      })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    console.error('Error listing boosters:', error);
    
    // Handle errors appropriately
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        content: 'There was an error fetching the server boosters. Please try again later.',
        ephemeral: true
      });
    } else {
      await interaction.reply({
        content: 'There was an error fetching the server boosters.',
        ephemeral: true
      });
    }
  }
}
