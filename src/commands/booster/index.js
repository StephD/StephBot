import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { executeMe } from './me.js';
import { executeList } from './list.js';
import { executeDiscordList } from './discord-list.js';
import { executeUpdateId } from './update-id.js';

// Define the command data using SlashCommandBuilder
export const data = new SlashCommandBuilder()
  .setName('booster')
  .setDescription('Commands for managing boosters')
  // User commands - available to everyone
  .addSubcommand(subcommand =>
    subcommand
      .setName('me')
      .setDescription('Show your booster information')
  )
  // Admin commands - restricted with permissions
  .addSubcommandGroup(group =>
    group
      .setName('admin')
      .setDescription('Admin commands for managing boosters')
      .addSubcommand(subcommand =>
        subcommand
          .setName('list')
          .setDescription('List all boosters')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('discord-list')
          .setDescription('List all boosters from discord (premium subscribers)')
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('update-id')
          .setDescription('Update your in-game ID')
          .addStringOption(option =>
            option
              .setName('game_id')
              .setDescription('Your new in-game ID')
              .setRequired(true)
          )
      )
  )
  // Set permissions for the admin subcommand group
  .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers);

// Main execute function that routes to the appropriate subcommand handler
export async function execute(interaction, client) {
  const subcommand = interaction.options.getSubcommand();
  const subcommandGroup = interaction.options.getSubcommandGroup(false);
  
  try {
    // For admin subcommand group, check for appropriate permissions
    if (subcommandGroup === 'admin') {
      // Check if user has moderator permissions OR booster role
      const member = interaction.member;
      const hasModPerms = member.permissions.has(PermissionFlagsBits.ModerateMembers);
      const hasBoosterRole = member.roles.cache.some(role => role.name === 'Booster' || role.name === 'Server Booster');
      
      if (!hasModPerms && !hasBoosterRole) {
        return interaction.reply({ 
          content: 'You need to be a moderator or server booster to use this command.', 
          ephemeral: true 
        });
      }
    }
    
    // Route to the appropriate subcommand handler
    if (subcommandGroup === 'admin') {
      if (subcommand === 'list') {
        await executeList(interaction, client);
      } else if (subcommand === 'discord-list') {
        await executeDiscordList(interaction, client);
      } else if (subcommand === 'update-id') {
        await executeUpdateId(interaction, client);
      }
    } else if (subcommand === 'me') {
      await executeMe(interaction, client);
    }
  } catch (error) {
    console.error(`Error executing booster ${subcommand} command:`, error);
    
    const errorMessage = `An error occurred while executing the command: ${error.message}`;
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}
