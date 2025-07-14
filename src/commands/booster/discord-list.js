import { EmbedBuilder } from 'discord.js';

export async function executeDiscordList(interaction, client) {
  try {
    // Defer reply as fetching members might take time
    await interaction.deferReply();
    
    console.log(`Fetching boosters for server: ${interaction.guild.name}`);
    
    // Get the premium_subscribers role (server boosters)
    const premiumRole = interaction.guild.roles.premiumSubscriberRole;
    
    if (!premiumRole) {
      return interaction.editReply('This server does not have any boosters or the premium subscribers role could not be found.');
    }
    
    // Fetch all guild members
    const members = await interaction.guild.members.fetch();
    
    // Filter for members with the premium subscriber role
    const boosters = members.filter(member => member.roles.cache.has(premiumRole.id));
    
    if (boosters.size === 0) {
      return interaction.editReply('This server does not have any boosters currently.');
    }
    
    // Convert collection to array and sort by premium_since date (oldest first)
    const sortedBoosters = [...boosters.values()]
      .sort((a, b) => {
        // Handle cases where premiumSince might be null/undefined
        if (!a.premiumSince) return 1;  // Move null values to the end
        if (!b.premiumSince) return -1;
        
        // Sort by premium_since date (oldest first)
        return new Date(a.premiumSince) - new Date(b.premiumSince);
      });
    
    // Create an embed to display the boosters
    const embed = new EmbedBuilder()
      .setTitle(`Server Boosters (${sortedBoosters.length})`)
      .setColor('#f47fff') // Discord Nitro pink color
      .setDescription(
        sortedBoosters.map(member => {
          const displayName = member.nickname || member.user.username;
          
          // Format the date as "5 July 2025"
          let formattedDate = 'Unknown';
          if (member.premiumSince) {
            const date = new Date(member.premiumSince);
            formattedDate = date.getDate() + ' ' + 
                           date.toLocaleString('en-US', { month: 'long' }) + ' ' + 
                           date.getFullYear();
          }
          
          return `\u2022 ${displayName} (${member.user.username}) - Boosting since ${formattedDate}`;
        }).join('\n').substring(0, 4096) // Ensure description doesn't exceed Discord's limit
      )
      .setFooter({
        text: `Total: ${sortedBoosters.length} booster${sortedBoosters.length !== 1 ? 's' : ''}`
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
