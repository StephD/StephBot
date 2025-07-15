import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getAllBoosters, createBooster } from '../../supabase/booster.js';
import supabase from '../../utils/supabase.js';
import { Colors } from '../../utils/colors.js';

/**
 * Execute the refresh_boosters command
 * This command will:
 * 1. Get all Discord boosters (premium subscribers)
 * 2. Get all boosters from the database
 * 3. Add missing boosters to the database (with active=true)
 * 4. Set inactive boosters to active=false in the database
 */
export async function executeRefreshBoosters(interaction, client) {
  try {
    // Defer reply as this operation might take time
    await interaction.deferReply({ ephemeral: true });
    
    // Create an embed to track the progress
    const embed = new EmbedBuilder()
      .setTitle('Refreshing Boosters')
      .setColor(Colors.INFO)
      .setDescription('Starting booster refresh process...')
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    
    // Step 1: Get all Discord boosters
    embed.setDescription('Fetching Discord boosters...');
    await interaction.editReply({ embeds: [embed] });
    
    // Get the premium_subscribers role (server boosters)
    const premiumRole = interaction.guild.roles.premiumSubscriberRole;
    
    if (!premiumRole) {
      embed.setColor(Colors.ERROR)
        .setDescription('This server does not have any boosters or the premium subscribers role could not be found.');
      return interaction.editReply({ embeds: [embed], ephemeral: true });
    }
    
    // Fetch all guild members
    const members = await interaction.guild.members.fetch();
    
    // Filter for members with the premium subscriber role
    const discordBoosters = members.filter(member => member.roles.cache.has(premiumRole.id));
    
    // Step 2: Get all boosters from the database
    embed.setDescription('Fetching database boosters...');
    await interaction.editReply({ embeds: [embed] });
    
    const dbResult = await getAllBoosters();
    
    if (!dbResult.success) {
      embed.setColor(Colors.ERROR)
        .setDescription(`Error fetching boosters from database: ${dbResult.error || 'Unknown error'}`);
      return interaction.editReply({ embeds: [embed] });
    }
    
    // Get all boosters (both active and inactive)
    const { data: allDbBoosters, error: allBoostersError } = await supabase
      .from('boosters')
      .select('*');
    
    if (allBoostersError) {
      embed.setColor(Colors.ERROR)
        .setDescription(`Error fetching all boosters from database: ${allBoostersError.message}`);
      return interaction.editReply({ embeds: [embed] });
    }
    
    // Step 3: Process the boosters
    embed.setDescription('Processing boosters...');
    await interaction.editReply({ embeds: [embed] });
    
    const discordBoosterIds = discordBoosters.map(member => member.id);
    const dbBoosterIds = allDbBoosters.map(booster => booster.discord_id);
    
    // Find boosters in Discord but not in DB (to be added)
    const boostersToAdd = discordBoosters.filter(member => !dbBoosterIds.includes(member.id));
    
    // Find boosters in DB but not in Discord (to be deactivated)
    const boostersToDeactivate = allDbBoosters.filter(
      booster => booster.active && !discordBoosterIds.includes(booster.discord_id)
    );
    
    // Find boosters to reactivate
    const boostersToReactivate = allDbBoosters.filter(
      booster => !booster.active && discordBoosterIds.includes(booster.discord_id)
    );

    // Show confirmation with buttons
    const confirmEmbed = new EmbedBuilder()
      .setTitle('Booster Sync Confirmation')
      .setColor(Colors.WARNING)
      .setDescription(
        `**The following changes will be made:**\n\n` +
        `• Add ${boostersToAdd.size} new boosters\n` +
        `• Deactivate ${boostersToDeactivate.length} boosters\n` +
        `• Reactivate ${boostersToReactivate.length} boosters\n\n` +
        `Do you want to continue?`
      )
      .setTimestamp();
    
    // Create confirmation buttons
    const confirmButton = new ButtonBuilder()
      .setCustomId('confirm_refresh')
      .setLabel('Yes, Continue')
      .setStyle(ButtonStyle.Success);
      
    const cancelButton = new ButtonBuilder()
      .setCustomId('cancel_refresh')
      .setLabel('Cancel')
      .setStyle(ButtonStyle.Danger);
    
    // Add buttons to an action row
    const row = new ActionRowBuilder()
      .addComponents(confirmButton, cancelButton);
    
    // Send the confirmation message with buttons
    const response = await interaction.editReply({ 
      embeds: [confirmEmbed],
      components: [row]
    }).then(response => response);
    
    // Create a collector for button interactions
    const collector = response.createMessageComponentCollector({ time: 60000 }); // 1 minute timeout
    
    // Return a promise that resolves when the operation is complete
    return new Promise((resolve, reject) => {
      try {
        // Handle button clicks
        collector.on('collect', async i => {
          try {
            // Verify that the user who clicked is the same who ran the command
            if (i.user.id !== interaction.user.id) {
              await i.reply({ content: 'This button is not for you!', ephemeral: true });
              return;
            }
            
            if (i.customId === 'cancel_refresh') {
              // User canceled the operation
              collector.stop('canceled');
              await i.update({ 
                embeds: [
                  new EmbedBuilder()
                    .setTitle('Operation Canceled')
                    .setColor(Colors.ERROR)
                    .setDescription('Booster sync operation was canceled.')
                    .setTimestamp()
                ],
                components: [] 
              });
              resolve();
              return;
            } else if (i.customId === 'confirm_refresh') {
              // User confirmed, proceed with the operation
              collector.stop('confirmed');
              await i.update({ 
                embeds: [
                  new EmbedBuilder()
                    .setTitle('Processing Changes')
                    .setColor(Colors.INFO)
                    .setDescription('Applying changes to the database...')
                    .setTimestamp()
                ],
                components: [] 
              });
              
              try {
                // Continue with the database operations
                let addedCount = 0;
                let updatedCount = 0;
                let deactivatedCount = 0;
                let errorCount = 0;
                
                // Process boosters to add
                embed.setDescription('Adding missing boosters...');
                await interaction.editReply({ embeds: [embed] });
                
                for (const member of boostersToAdd) {
                  try {
                    const user = member[1].user;
                    const discordId = user.id;
                    const discordName = user.username;
                    const nickname = user.globalName;
                    const premiumSince = member[1].premiumSinceTimestamp;
                    
                    // Create new booster with empty game_id
                    const result = await createBooster({
                      discordId,
                      discordName,
                      gameId: '',  // Empty game ID
                      premiumSince,
                      discordNickname: nickname
                    });
                    
                    if (result.success) {
                      addedCount++;
                    } else {
                      errorCount++;
                      console.error(`Error adding booster ${discordName}:`, result.message);
                    }
                  } catch (error) {
                    errorCount++;
                    console.error('Error processing booster to add:', error);
                  }
                }
                
                // Step 5: Deactivate boosters who are no longer boosting
                embed.setDescription('Deactivating former boosters...');
                await interaction.editReply({ embeds: [embed] });
                
                for (const booster of boostersToDeactivate) {
                  try {
                    const { error } = await supabase
                      .from('boosters')
                      .update({ 
                        active: false,
                        premium_since: null,
                        updated_at: new Date().toISOString()
                      })
                      .eq('discord_id', booster.discord_id);
                    
                    if (error) {
                      errorCount++;
                      console.error(`Error deactivating booster ${booster.discord_name}:`, error.message);
                    } else {
                      deactivatedCount++;
                    }
                  } catch (error) {
                    errorCount++;
                    console.error('Error processing booster to deactivate:', error);
                  }
                }
                
                // Step 6: Check for boosters that need to be reactivated
                embed.setDescription('Checking for boosters to reactivate...');
                await interaction.editReply({ embeds: [embed] });
                
                for (const booster of boostersToReactivate) {
                  try {
                    const member = discordBoosters.get(booster.discord_id);
                    if (member) {
                      const { error } = await supabase
                        .from('boosters')
                        .update({ 
                          active: true,
                          premium_since: member.premiumSinceTimestamp ? new Date(member.premiumSinceTimestamp).toISOString().split('T')[0] : null,
                          updated_at: new Date().toISOString()
                        })
                        .eq('discord_id', booster.discord_id);
                      
                      if (error) {
                        errorCount++;
                        console.error(`Error reactivating booster ${booster.discord_name}:`, error.message);
                      } else {
                        updatedCount++;
                      }
                    }
                  } catch (error) {
                    errorCount++;
                    console.error('Error processing booster to reactivate:', error);
                  }
                }
                
                // Final report
                const totalDiscordBoosters = discordBoosters.size;
                const totalDbBoosters = allDbBoosters.filter(b => b.active).length;
                const totalAfterSync = totalDbBoosters + addedCount + updatedCount - deactivatedCount;
                
                embed.setColor(Colors.SUCCESS)
                  .setTitle('Booster Refresh Complete')
                  .setDescription(
                    `**Sync Results:**\n\n` +
                    `• Discord Boosters: ${totalDiscordBoosters}\n` +
                    `• Database Boosters (before): ${totalDbBoosters}\n` +
                    `• Database Boosters (after): ${totalAfterSync}\n\n` +
                    `**Actions Taken:**\n\n` +
                    `• Added: ${addedCount} new boosters\n` +
                    `• Reactivated: ${updatedCount} boosters\n` +
                    `• Deactivated: ${deactivatedCount} boosters\n` +
                    `• Errors: ${errorCount}`
                  )
                  .setTimestamp();
                
                await interaction.editReply({ embeds: [embed] });
                resolve();
              } catch (error) {
                console.error('Error executing database operations:', error);
                await i.followUp({
                  embeds: [
                    new EmbedBuilder()
                      .setTitle('Error')
                      .setColor(Colors.ERROR)
                      .setDescription(`An error occurred while processing boosters: ${error.message}`)
                      .setTimestamp()
                  ],
                  ephemeral: true
                });
                reject(error);
              }
            }
          } catch (error) {
            console.error('Error handling button interaction:', error);
            reject(error);
          }
        });
        
        // Handle collector end
        collector.on('end', async collected => {
          try {
            if (collected.size === 0) {
              // No button was clicked, operation timed out
              await interaction.editReply({
                embeds: [
                  new EmbedBuilder()
                    .setTitle('Operation Timed Out')
                    .setColor(Colors.ERROR)
                    .setDescription('Booster sync operation was canceled due to timeout.')
                    .setTimestamp()
                ],
                components: []
              });
              resolve();
            }
          } catch (error) {
            console.error('Error handling collector end:', error);
          }
        });
      } catch (error) {
        console.error('Error in button collector setup:', error);
        
        interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle('Error')
              .setColor(Colors.ERROR)
              .setDescription(`An error occurred: ${error.message}`)
              .setTimestamp()
          ],
          components: []
        });
        
        reject(error);
      }
    });
  } catch (error) {
    console.error('Error executing refresh_boosters command:', error);
    
    if (interaction.deferred || interaction.replied) {
      await interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Error')
            .setColor(Colors.ERROR)
            .setDescription(`An error occurred while refreshing boosters: ${error.message}`)
            .setTimestamp()
        ]
      });
    } else {
      await interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle('Error')
            .setColor(Colors.ERROR)
            .setDescription(`An error occurred while refreshing boosters: ${error.message}`)
            .setTimestamp()
        ],
        ephemeral: true
      });
    }
    
    return Promise.reject(error);
  }
}
