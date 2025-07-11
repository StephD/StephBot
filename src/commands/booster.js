import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getAllBoosters, updateBoosterIgId } from '../supabase/booster.js';
import { hasPermission } from '../config/roles.js';

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
  )
  .addSubcommand(subcommand =>
    subcommand
      .setName('list')
      .setDescription('List all boosters (Admin only)')
)
  .addSubcommand(subcommand =>
    subcommand
      .setName('discord-list')
      .setDescription('List all booster from discord (premium subscribers)')
  )
  // Restrict the list command to administrators only
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

// Function removed as we're now using the one from supabase.js

export async function execute(interaction, client) {
  const subcommand = interaction.options.getSubcommand();
  
  if (subcommand === 'list') {
    // Check if user has admin or booster manager permissions
    if (!hasPermission(interaction.member, ['admin', 'boosterManager'])) {
      return interaction.reply({ 
        content: 'You do not have permission to use this command.', 
        ephemeral: true 
      });
    }
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
            `   • IG ID: ${booster.ig_id || 'Not set'}
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
            const boosterText = `**•** <@${booster.discord_id}> (${booster.discord_name}) - IG ID: ${booster.ig_id || 'Not set'}`;
            
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
      
      // Call the function to update the booster UID in Supabase
      const result = await updateBoosterIgId(discordId, discordName, igId, premiumSince);
      
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
  } else if (subcommand === 'discord-list') { 
    // Check if user has admin or booster manager permissions
    if (!hasPermission(interaction.member, ['admin', 'boosterManager'])) {
      return interaction.reply({ 
        content: 'You do not have permission to use this command.', 
        ephemeral: true 
      });
    }
    
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
  }
}
