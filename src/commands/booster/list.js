import { EmbedBuilder } from 'discord.js';
import { getAllBoosters } from '../../supabase/booster.js';

export async function executeList(interaction, client) {
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
        return `**${index + 1}.** <@${booster.discord_id}> (${booster.discord_name})`;
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
          const boosterText = `**${index + 1}.** <@${booster.discord_id}> (${booster.discord_name})`;
          
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
}