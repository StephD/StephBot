import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Colors } from '../utils/colors.js';

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

export const data = isDev ? new SlashCommandBuilder()
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
  ).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers) : [];

export async function execute(interaction, client) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'list-users') {
    const role = interaction.options.getRole('role');
    
    try {
      // Defer reply as fetching members might take time
      await interaction.deferReply({ withResponse: true });
      
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
        .setColor(role.color || Colors.SECONDARY)
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
            flags: ['Ephemeral']
          });
        }
      } else {
        await interaction.reply({
          content: 'There was an error fetching users with this role.',
          flags: ['Ephemeral']
        });
      }
    }
  }
}
