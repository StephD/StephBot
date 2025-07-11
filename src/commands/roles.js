import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('roles')
  .setDescription('Commands for managing and viewing roles')
  .addSubcommand(subcommand =>
    subcommand
      .setName('list-users')
      .setDescription('List all users with a specific role')
      .addRoleOption(option =>
        option
          .setName('role')
          .setDescription('The role to list users from')
          .setRequired(true)
      )
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list-boosters')
      .setDescription('List all server boosters (premium subscribers)')
  );

export async function execute(interaction, client) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'list-boosters') {
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
          boosters.map(member => 
            `• ${member.user.username} (${member.user.id}) - Boosting since ${member.premiumSince ? new Date(member.premiumSince).toLocaleDateString() : 'Unknown'}`
          ).join('\n').substring(0, 4096) // Ensure description doesn't exceed Discord's limit
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
  } else if (subcommand === 'list-users') {
    const role = interaction.options.getRole('role');
    
    try {
      // Defer reply as fetching members might take time
      const response = await interaction.deferReply({ withResponse: true });
      
      // Instead of fetching all members, we'll fetch only members with the specific role
      // This is much more efficient, especially for large servers
      
      // Create a promise that rejects after 15 seconds (increased timeout for larger servers)
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Command timed out after 10 seconds')), 10000);
      });
      
      // Simple approach to get members with a role
      const fetchMembers = async () => {
        try {
          console.log(`Fetching members for role: ${role.name} (${role.id})`);
          
          // Get guild members with the role
          // This will use the cache first, then fetch from API if needed
          const members = await interaction.guild.members.fetch();
          const roleMembers = members.filter(member => member.roles.cache.has(role.id));
          
          console.log(`Found ${roleMembers.size} members with role ${role.name}`);
          return roleMembers;
        } catch (error) {
          console.error('Error fetching role members:', error);
          throw error;
        }
      };
      
      // Race between the timeout and the fetch
      const membersWithRole = await Promise.race([fetchMembers(), timeout]);
      // console.log(membersWithRole);
      
      if (membersWithRole.size === 0) {
        return interaction.editReply(`No users have the role **${role.name}**.`);
      }
      
      // Create an embed to display the users
      const embed = new EmbedBuilder()
        .setTitle(`Users with role: ${role.name}`)
        .setColor(role.color || '#2F3136')
        .setDescription(
          membersWithRole.map(member => 
            `• ${member.user.username} (${member.user.id})`
          ).join('\n').substring(0, 4096) // Ensure description doesn't exceed Discord's limit
        )
        .setFooter({ 
          text: `Total: ${membersWithRole.size} user${membersWithRole.size !== 1 ? 's' : ''}` 
        })
        .setTimestamp();
      
      // If there are too many users to fit in one embed, add a note
      if (membersWithRole.size > 100) {
        embed.addFields({ 
          name: 'Note', 
          value: 'Only showing the first 100 users due to Discord limitations.' 
        });
      }
      
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Error listing users with role:', error);
      
      // Check if we've already replied
      if (interaction.deferred || interaction.replied) {
        // Custom message for timeout
        if (error.message === 'Command timed out after 10 seconds') {
          await interaction.editReply('The command timed out after 10 seconds. The server might be experiencing high load or the role has too many members.');
        } else {
          // Provide more detailed error information for debugging
          console.error('Detailed error:', error);
          await interaction.editReply({
            content: 'There was an error fetching users with this role. Please try again later or contact a server administrator if the issue persists.',
            ephemeral: true
          });
        }
      } else {
        await interaction.reply({
          content: 'There was an error fetching users with this role.',
          ephemeral: true
        });
      }
    }
  }
}
