import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { Colors } from '../utils/colors.js';
import { getAllBoosters, updateBoosterGameId, getBoosterByDiscordId } from '../supabase/booster.js';
import { executeMe } from './booster/me.js';
import { executeAddMe } from './booster/addme.js';
import { executeList } from './booster/list.js';
import { executeDiscordList } from './booster/discord-list.js';

// Define the command data using SlashCommandBuilder
export const data = [
  new SlashCommandBuilder()
    .setName('booster')
    .setDescription('Commands for managing boosters')
    // User commands - available to everyone
    .addSubcommand(subcommand => subcommand.setName('me')
      .setDescription('Show your booster information'))
    .addSubcommand(subcommand => subcommand.setName('addme')
      .setDescription('Add yourself to the booster list')
      .addStringOption(option =>
        option
          .setName('game_id')
          .setDescription('Your in-game ID')
          .setRequired(true)
      )
  ),
  
  // Admin commands - restricted with permissions
  new SlashCommandBuilder()
    .setName('booster_admin')
    .setDescription('Admin commands for managing boosters')
    .addSubcommand(subcommand =>
      subcommand
        .setName('list')
        .setDescription('List all boosters from database')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('discord-list')
        .setDescription('List all boosters from discord (premium subscribers)')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('me2')
        .setDescription('Show your booster information')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  ];

export async function execute(interaction, client) {
  const commandName = interaction.commandName;
  const subcommand = interaction.options.getSubcommand();
  
  if (commandName === 'booster') {
    if (subcommand === 'me') {
      await executeMe(interaction, client);
    }
    if (subcommand === 'addme') {
      await executeAddMe(interaction, client);
    }
  }
  
  // Handle admin subcommand group - permissions are already set at the Discord API level
  // through setDefaultMemberPermissions in the command definition
  if (commandName === 'booster_admin') {
    if (subcommand === 'list') {
      try {
        // Defer reply as the operation might take time
        await executeList(interaction, client);
      } catch (error) {
        console.error('Error executing booster list command:', error);
      
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(`Error: ${error.message}`);
        } else {
          await interaction.reply({ content: `Error: ${error.message}`, flags: ['Ephemeral'] });
        }
      }
    } else if (subcommand === 'discord-list') {
        await executeDiscordList(interaction, client);
    } else if (subcommand === 'me2') {
        await executeMe(interaction, client);
    }
  }
}
