import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { executeMe, executeAddMe, executeList, executeDiscordList, executeRefreshBoosters, executeWelcome } from './booster/index.js';

// Define the command data using SlashCommandBuilder
export const data = [
  new SlashCommandBuilder()
    .setName('booster')
    .setDescription('Commands for managing boosters')
    .addSubcommand(subcommand => subcommand.setName('my-status')
      .setDescription('Show your booster information'))
    .addSubcommand(subcommand => subcommand.setName('add-me')
      .setDescription('Add your gameId to the booster list')
      .addStringOption(option =>
        option
          .setName('game_id')
          .setDescription('Your in-game ID')
          .setRequired(true)
      )
  ),
  
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
        .setName('refresh_boosters')
        .setDescription('Sync Discord boosters with database - add missing ones and deactivate removed ones')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('welcome')
        .setDescription('Display welcome message with booster registration options')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
  ];

export async function execute(interaction, client) {
  const commandName = interaction.commandName;
  const subcommand = interaction.options.getSubcommand();
  
  if (commandName === 'booster') {
    if (subcommand === 'my-status') {
      await executeMe(interaction, client);
    }
    else if (subcommand === 'add-me') {
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
    } else if (subcommand === 'refresh_boosters') {
        await executeRefreshBoosters(interaction, client);
    } else if (subcommand === 'welcome') {
        await executeWelcome(interaction, client);
    }
  }
}
