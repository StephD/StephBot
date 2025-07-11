import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getAllBoosters, updateBoosterGameId, getBoosterByDiscordId } from '../supabase/booster.js';
import { executeMe } from './booster/me.js';
import { executeAddMe } from './booster/addme.js';

// Define the command data using SlashCommandBuilder
export const data = [
  new SlashCommandBuilder()
    .setName('booster')
    .setDescription('Commands for managing boosters')
    // User commands - available to everyone
    .addSubcommand(subcommand =>
      subcommand
      .setName('me')
      .setDescription('Show your booster information')
    )
    .addSubcommand(subcommand =>
      subcommand
      .setName('addme')
      .setDescription('Add yourself to the booster list')      .addStringOption(option =>
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
    .addSubcommand(subcommand =>
      subcommand
        .setName('me2')
        .setDescription('Show your booster information')
    )    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
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
        await interaction.deferReply();
      
        // Get all boosters from Supabase
        const result = await getAllBoosters();
      
        if (result.success && result.data) {
          // Create an embed to display the boosters
          const embed = new EmbedBuilder()
            .setTitle('Registered Boosters')
            .setColor('#5865F2')
            .setDescription(`Total boosters: ${result.data.length}`)
            .setTimestamp();
        
          // If there are no boosters
          if (result.data.length === 0) {
            embed.setDescription('No boosters found in the database.');
            return interaction.editReply({ embeds: [embed] });
          }
        
          // Format the booster data
          const boosterList = result.data.map((booster, index) => {
            return `**${index + 1}.** <@${booster.discord_id}> (${booster.discord_name})
` +
              `   • IG ID: ${booster.game_id || 'Not set'}
` +
              `   • Boosting since: ${booster.premium_since ? new Date(booster.premium_since).toLocaleDateString() : 'Not boosting'}`;
          }).join('\n\n');
        
          // Split into chunks if too long (Discord has a 4096 character limit for embed descriptions)
          if (boosterList.length <= 4000) {
            embed.setDescription(boosterList);
            await interaction.editReply({ embeds: [embed] });
          } else {
            // If too many boosters, paginate or send multiple embeds
            const chunks = [];
            let currentChunk = '';
          
            for (const booster of result.data) {
              const boosterText = `**•** <@${booster.discord_id}> (${booster.discord_name}) - IG ID: ${booster.game_id || 'Not set'}`;
            
              if (currentChunk.length + boosterText.length + 1 > 4000) {
                chunks.push(currentChunk);
                currentChunk = boosterText;
              } else {
                currentChunk += (currentChunk ? '\n' : '') + boosterText;
              }
            }
          
            if (currentChunk) {
              chunks.push(currentChunk);
            }
          
            // Send the first chunk
            embed.setDescription(chunks[0]);
            embed.setFooter({ text: `Page 1/${chunks.length} | Total: ${result.data.length} boosters` });
          
            await interaction.editReply({ embeds: [embed] });
          
            // Send additional chunks as follow-up messages if needed
            for (let i = 1; i < chunks.length; i++) {
              const followUpEmbed = new EmbedBuilder()
                .setTitle(`Registered Boosters (continued)`)
                .setColor('#5865F2')
                .setDescription(chunks[i])
                .setFooter({ text: `Page ${i + 1}/${chunks.length} | Total: ${result.data.length} boosters` })
                .setTimestamp();
            
              await interaction.followUp({ embeds: [followUpEmbed] });
            }
          }
        } else {
          // Handle error
          await interaction.editReply(`Error fetching boosters: ${result.error || 'Unknown error'}`);
        }
      } catch (error) {
        console.error('Error executing booster list command:', error);
      
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(`Error: ${error.message}`);
        } else {
          await interaction.reply({ content: `Error: ${error.message}`, ephemeral: true });
        }
      }
    } else if (subcommand === 'update-id') {
      // Get command options
      const gameId = interaction.options.getString('game_id');
    
      try {
        // Defer reply as the operation might take time
        await interaction.deferReply();
      
        // Get the Discord user information of the person who invoked the command
        const user = interaction.user;
        const discordId = user.id;
      
        // Use the server nickname if available, otherwise fall back to global username
        const discordName = interaction.member.nickname || user.username;
      
        // Get the GuildMember object to access premium status
        const member = interaction.member;
        const premiumSince = member.premiumSinceTimestamp;
      
        console.log(discordId, discordName, gameId);
        console.log('Premium since timestamp:', premiumSince);
      
        // Call the function to update the booster UID in Supabase
        const result = await updateBoosterGameId(discordId, discordName, gameId, premiumSince);
      
        if (result.success) {
          // Create a success embed
          const successEmbed = new EmbedBuilder()
            .setTitle('Booster ID Updated')
            .setColor('#00FF00')
            .setDescription(result.message)
            .addFields(
              { name: 'Discord User', value: `<@${discordId}> (${discordName})`, inline: true },
              { name: 'New In-Game ID', value: gameId, inline: true },
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
    } else if (subcommand === 'me2') {
      try {
        // Defer reply as the operation might take time
        await interaction.deferReply();
      
        // Get user information
        const user = interaction.user;
        const discordId = user.id;
        const discordName = user.username;
      
        // Get the GuildMember object to access roles and premium status
        const member = interaction.member;
        const nickname = member.globalName || 'None';
        const premiumSince = member.premiumSinceTimestamp;
        const isPremium = !!premiumSince;
      
        // Get user roles
        const roles = member.roles.cache
          .sort((a, b) => b.position - a.position) // Sort by position (highest first)
          .map(role => ({
            id: role.id,
            name: role.name,
            color: role.hexColor,
            position: role.position
          }))
          .filter(role => role.name !== '@everyone'); // Filter out @everyone role
      
        // Get booster data from Supabase
        const result = await getBoosterByDiscordId(discordId);
      
        // Create embed
        const embed = new EmbedBuilder()
          .setTitle('Your Booster Information')
          .setColor(isPremium ? '#f47fff' : '#5865F2') // Pink for premium, Discord blue for non-premium
          .addFields(
            { name: 'Discord User', value: `<@${discordId}>`, inline: true },
            { name: 'Username', value: discordName, inline: true },
            { name: 'Nickname', value: nickname, inline: true },
            { name: 'Discord ID', value: discordId, inline: false },
            { name: 'Booster Status', value: isPremium ? `Boosting since ${new Date(premiumSince).toLocaleDateString()}` : 'Not boosting', inline: false }
          )
          .setTimestamp();
      
        // Add roles information
        if (roles.length > 0) {
          // Format roles with their IDs
          const rolesList = roles.map(role => `<@&${role.id}> (${role.name}) - ID: ${role.id}`).join('\n');
          embed.addFields({ name: '🛡️ Roles', value: rolesList || 'No roles', inline: false });
        } else {
          embed.addFields({ name: '🛡️ Roles', value: 'No roles', inline: false });
        }
      
        // Add database information if available
        if (result.success && result.data) {
          embed.addFields(
            { name: '📊 Database Information', value: '─────────────────', inline: false },
            { name: 'Game ID', value: result.data.game_id || 'Not set', inline: true },
            { name: 'First Registered', value: result.data.created_at ? new Date(result.data.created_at).toLocaleDateString() : 'Unknown', inline: true },
            { name: 'Last Updated', value: result.data.updated_at ? new Date(result.data.updated_at).toLocaleDateString() : 'Unknown', inline: true }
          );
        } else {
          embed.addFields(
            { name: '📊 Database Information', value: 'No records found in database. Use `/booster update-id` to register.', inline: false }
          );
        }
      
        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error('Error executing booster me command:', error);
      
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply(`Error: ${error.message}`);
        } else {
          await interaction.reply({ content: `Error: ${error.message}`, ephemeral: true });
        }
      }
    }
  }
}
