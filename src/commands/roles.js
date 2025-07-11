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
  );

export async function execute(interaction, client) {
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === 'list-users') {
    const role = interaction.options.getRole('role');
    console.log(role);
    
    try {
      // Defer reply as fetching members might take time
      await interaction.deferReply();
      
      // Instead of fetching all members, we'll fetch only members with the specific role
      // This is much more efficient, especially for large servers
      
      // Create a promise that rejects after 15 seconds (increased timeout for larger servers)
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Command timed out after 15 seconds')), 15000);
      });
      
      // Create the optimized fetch members promise
      const fetchMembers = async () => {
        try {
          // Get the role members directly from the role object
          // This is much faster than fetching all guild members
          const roleMembers = await role.members;
          return roleMembers;
        } catch (error) {
          console.error('Error fetching role members directly:', error);
          
          // Fallback method if the direct approach fails
          console.log('Falling back to alternative method...');
          const fetchOptions = { cache: false };
          const members = await interaction.guild.members.fetch(fetchOptions);
          return members.filter(member => member.roles.cache.has(role.id));
        }
      };
      
      // Race between the timeout and the fetch
      const membersWithRole = await Promise.race([fetchMembers(), timeout]);
      
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
        if (error.message === 'Command timed out after 5 seconds') {
          await interaction.editReply('The command timed out after 5 seconds. The server might be experiencing high load or the role has too many members.');
        } else {
          await interaction.editReply('There was an error fetching users with this role.');
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
