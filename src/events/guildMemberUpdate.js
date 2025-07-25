export const name = 'guildMemberUpdate';
export const once = false;

import { updateBoosterActive, createBooster } from '../supabase/booster.js';
import { Colors } from '../utils/colors.js';
import { EmbedBuilder } from 'discord.js';

const isDev = process.env.NODE_ENV === 'development';
const CUSTOM_BOOSTER_ROLE_NAME = 'Booster';
const BOOSTER_LOG_CHANNEL_NAME = ['booster-log'];
const BOOSTER_CHANNEL_NAME = 'booster-only'; 

export async function execute(oldMember, newMember, client) {
  try {
    let botLogChannel = null;
    let editDB = true
    let sendToBoosterChannel = false
    let sendDM = true
    try {
      botLogChannel = newMember.guild.channels.cache.find(channel => 
        BOOSTER_LOG_CHANNEL_NAME.includes(channel.name) && 
        channel.permissionsFor(client.user).has(['ViewChannel', 'SendMessages'])
      );
      
      if (!botLogChannel) {
        console.log(`No suitable booster log channel found with proper permissions`);
      }
    } catch (error) {
      console.error('Error finding booster log channel:', error.message);
    }

    const roleUpdate = oldMember.roles.cache.size !== newMember.roles.cache.size;
    if (roleUpdate) {
      // console.log(`[DEBUG] ---- Role update detected for ${newMember.user.globalName || newMember.user.username} (${newMember.user.tag})`);
      const premiumRole = newMember.guild.roles.premiumSubscriberRole;

      const isAdd = oldMember.roles.cache.size < newMember.roles.cache.size;
      const isRemove = oldMember.roles.cache.size > newMember.roles.cache.size;
      
      if (isAdd) {
        const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
        // console.log(`[DEBUG] Added roles: ${addedRoles.map(r => r.name).join(', ')}`);
        // console.log(`[DEBUG] Added roles IDs: ${addedRoles.map(r => r.id).join(', ')}`);
        
        const isPremiumRoleAdded = premiumRole && addedRoles.some(role => role.id === premiumRole.id);
        const customBoosterRole = addedRoles.find(role => role.name === CUSTOM_BOOSTER_ROLE_NAME);
        const premiumSince = newMember.premiumSinceTimestamp;
        
        if (isPremiumRoleAdded || customBoosterRole) {
          // console.log(`[] ---- Premium Role added for ${newMember.user.globalName || newDEBUGMember.user.username} (${newMember.user.tag})`);
          // console.log(`[DEBUG] Is premium role added: ${isPremiumRoleAdded ? 'Yes' : 'No'}`);
          // console.log(`[DEBUG] Is custom booster role added: ${customBoosterRole ? 'Yes' : 'No'}`); 
          // console.log(`[DEBUG] Is he real premium: ${premiumSince ? 'Yes' : 'No'}`);
          
          // Create a nice embed for boost added
          const boostAddedEmbed = new EmbedBuilder()
            .setColor(Colors.SUCCESS)
            .setTitle('🎉 Server Boost Added!')
            .setDescription(`**${newMember.user.globalName || newMember.user.username}** just boosted the server!`)
            .addFields(
              { name: 'User', value: `<@${newMember.id}> (${newMember.user.tag})`, inline: true },
              { name: 'Booster Status', value: premiumSince ? `✅ Since <t:${Math.floor(premiumSince/1000)}:R>` : '❌ Not currently boosting', inline: true },
              { name: 'Role added Details', value: `Premium Role: ${isPremiumRoleAdded ? '✅' : '❌'}\nCustom Role: ${customBoosterRole ? '✅' : '❌'}` }
            )
          
          if (botLogChannel) {
            await botLogChannel.send({ embeds: [boostAddedEmbed] });
          }
          console.log(`🎉 ${newMember.user.globalName || newMember.user.username} (${newMember.user.tag}) just boosted the server!`);
          
          // if (sendToBoosterChannel) {
          //   try {
          //     boosterChannel = newMember.guild.channels.cache.find(channel => 
          //       channel.name === BOOSTER_CHANNEL_NAME && 
          //       channel.permissionsFor(client.user).has(['ViewChannel', 'SendMessages'])
          //     );
              
          //     if (!boosterChannel && isDev) {
          //       console.log(`[DEV] No suitable booster channel found with proper permissions`);
          //     }
          //   } catch (error) {
          //     console.error('Error finding booster channel:', error.message);
          //   }
          // }
          
          if (editDB) {
            // console.log(`[DEBUG] I will add ${newMember.user.globalName || newMember.user.username} to the DB booster list`); 
            const { success, message } = await createBooster({
              discordId: newMember.id,
              discordName: newMember.user.username,
              gameId: '',
              premiumSince: newMember.premiumSinceTimestamp,
              discordNickname: newMember.user.globalName
            });

            if (!success) {
              if (message.includes('already exists')) {
                // console.log(`[DEBUG] ${newMember.user.globalName || newMember.user.username} is already in the booster list, just updating the booster active status`);

                if (premiumSince) {
                  // console.log(`[DEBUG] ${newMember.user.globalName || newMember.user.username} is premium, updating the booster active status to true`);
                } else {
                  // console.log(`[DEBUG] ${newMember.user.globalName || newMember.user.username} is not a real premium, updating the booster active status to false`);
                }
                const { success, message } = await updateBoosterActive(newMember.id, premiumSince );
                
                if (!success) {
                  console.error('Error updating booster:', message);
                  
                  // Create error embed
                  const dbErrorEmbed = new EmbedBuilder()
                    .setColor(Colors.ERROR)
                    .setTitle('❌ Database Update Failed')
                    .setDescription(`Failed to update booster status for **${newMember.user.globalName || newMember.user.username}**`)
                    .addFields({ name: 'Error', value: message })
                    
                  if (botLogChannel) {
                    await botLogChannel.send({ embeds: [dbErrorEmbed] });
                  }
                } else {
                  // Create success embed
                  const dbSuccessEmbed = new EmbedBuilder()
                    .setColor(Colors.INFO)
                    .setTitle('✅ Database Update Successful')
                    // the user already exist in the DB
                    .setDescription(`The user already exist in the DB, just updating the booster status\n**${newMember.user.globalName || newMember.user.username}** has been **updated** in the database`)
                    .addFields(
                      { name: 'User', value: `<@${newMember.id}> (${newMember.user.tag})`, inline: true },
                      { name: 'Database Status', value: '✅ ENABLED', inline: true },
                      { name: 'Booster Perks', value: 'Active', inline: true }
                    )
                    .setFooter({ text: 'Booster database updated successfully' })
                  
                  if (botLogChannel) {
                    await botLogChannel.send({ embeds: [dbSuccessEmbed] });
                  }
                  console.log(`✅ ${newMember.user.globalName || newMember.user.username} has been enabled to the booster list!`);
                }
              } else {
                console.error('Error creating booster:', message);
                
                // Create error embed
                const dbErrorEmbed = new EmbedBuilder()
                  .setColor(Colors.ERROR)
                  .setTitle('❌ Database Update Failed')
                  .setDescription(`Failed to add **${newMember.user.globalName || newMember.user.username}** to the booster list`)
                  .addFields({ name: 'Error', value: message })
                  
                if (botLogChannel) {
                  await botLogChannel.send({ embeds: [dbErrorEmbed] });
                }
              }
            } else {
              // Create a database success embed
              const dbSuccessEmbed = new EmbedBuilder()
                .setColor(Colors.INFO)
                .setTitle('✅ Database Created Successful')
                .setDescription(`**${newMember.user.globalName || newMember.user.username}** has been **added** to the booster list`)
                .addFields(
                  { name: 'User', value: `<@${newMember.id}> (${newMember.user.tag})`, inline: true },
                  { name: 'Premium', value: premiumSince ? '✅' : '❌', inline: true },
                  { name: 'Database Status', value: '✅ CREATED', inline: true },
                  { name: 'Booster Perks', value: 'Active', inline: true }
                )
                .setFooter({ text: 'Booster database updated successfully' })
              
              if (botLogChannel) {
                await botLogChannel.send({ embeds: [dbSuccessEmbed] });
              }
              console.log(`✅ ${newMember.user.globalName || newMember.user.username} has been added to the booster list!`);
            }
          }

          if (sendDM) {
            try {
              await newMember.user.send(`Thank you for boosting our server! 💖\n\n` +
                `Please answer your game ID so we can add you to the booster list.`);
            } catch (error) {
              console.error('Could not send DM to booster:', error);
            }
          }
        }
      }
      
      if (isRemove) {
        const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
        // console.log(`[DEBUG] Removed roles: ${removedRoles.map(r => r.name).join(', ')}`);
        
        const isPremiumRoleRemoved = premiumRole && removedRoles.some(role => role.id === premiumRole.id);
        const customBoosterRole = removedRoles.find(role => role.name === CUSTOM_BOOSTER_ROLE_NAME);
        const premiumSince = newMember.premiumSinceTimestamp;
        
        if (isPremiumRoleRemoved || customBoosterRole) {
          // console.log(`[DEBUG] ---- Premium Role removed for ${newMember.user.globalName || newMember.user.username} (${newMember.user.tag})`);
          // console.log(`[DEBUG] Is premium role removed: ${isPremiumRoleRemoved ? 'Yes' : 'No'}`); 
          // console.log(`[DEBUG] Is custom booster role removed: ${customBoosterRole ? 'Yes' : 'No'}`);

          // Create a nice embed for boost removed
          const boostRemovedEmbed = new EmbedBuilder()
            .setColor(Colors.ERROR)
            .setTitle('❌ Server Boost Removed')
            .setDescription(`**${newMember.user.globalName || newMember.user.username}** is no longer boosting the server!`)
            .addFields(
              { name: 'User', value: `<@${newMember.id}> (${newMember.user.tag})`, inline: true },
              { name: 'Booster Status', value: premiumSince ? '✅ Still has premium' : '❌ Premium removed', inline: true },
              { name: 'Role removed', value: `Premium Role Removed: ${isPremiumRoleRemoved ? '✅' : '❌'}\nCustom Role Removed: ${customBoosterRole ? '✅' : '❌'}` }
            )
          
          if (botLogChannel) {
            await botLogChannel.send({ embeds: [boostRemovedEmbed] });
          }
          console.log(`❌ ${newMember.user.globalName || newMember.user.username} (${newMember.user.tag}) is no longer boosting the server!`);
        
          if (editDB) {
            // console.log(`[DEBUG] I will remove ${newMember.user.globalName || newMember.user.username} from the DB booster list`); 
            const { success, message } = await updateBoosterActive(newMember.id, false);
            if (!success) {
              console.error('Error updating booster active status:', message);
              
              // Create error embed
              const dbErrorEmbed = new EmbedBuilder()
                .setColor(Colors.ERROR)
                .setTitle('❌ Database Update Failed')
                .setDescription(`Failed to update booster status for **${newMember.user.globalName || newMember.user.username}**`)
                .addFields({ name: 'Error', value: message })
                
              if (botLogChannel) {
                await botLogChannel.send({ embeds: [dbErrorEmbed] });
              }
            } else {
              // Create success embed
              const dbSuccessEmbed = new EmbedBuilder()
                .setColor(Colors.INFO)
                .setTitle('✅ Database Update Successful')
                .setDescription(`**${newMember.user.globalName || newMember.user.username}** has been **disabled** in the booster list`)
                .addFields(
                  { name: 'User', value: `<@${newMember.id}> (${newMember.user.tag})`, inline: true },
                  { name: 'Database Status', value: '❌ DISABLED', inline: true },
                  { name: 'Booster Perks', value: 'Inactive', inline: true }
                )
                .setFooter({ text: 'Booster database updated successfully' })
              
              if (botLogChannel) {
                await botLogChannel.send({ embeds: [dbSuccessEmbed] });
              }
              console.log(`✅ ${newMember.user.globalName || newMember.user.username} has been disabled from the booster list!`);
            }
          }
        }
      }
    }  
  } catch (error) {
    console.error('Error in guildMemberUpdate event:', error);
    
    // Specific handling for Missing Access error
    if (error.code === 50001) {
      console.error('Missing Access error: The bot does not have the required permissions to perform this action.');
      console.error('Please ensure the bot has proper permissions in the server and channels.');
      
      // Log additional context for Missing Access errors
      if (isDev) {
        console.error(`[DEV] Guild ID: ${newMember?.guild?.id || 'Unknown'}`);
        console.error(`[DEV] Guild Name: ${newMember?.guild?.name || 'Unknown'}`);
        console.error(`[DEV] Bot permissions in guild: ${newMember?.guild?.members?.me?.permissions?.toArray().join(', ') || 'Unknown'}`);
        
        // Log available channels and bot permissions in each
        const channels = newMember?.guild?.channels?.cache;
        if (channels) {
          console.error(`[DEV] Available channels and permissions:`);
          channels.forEach(channel => {
            const perms = channel.permissionsFor(client.user);
            if (perms) {
              console.error(`[DEV] - ${channel.name} (${channel.id}): ${perms.toArray().join(', ')}`);
            }
          });
        }
      }
    }
    
    if (isDev) {
      console.error('[DEV] Detailed error information:');
      console.error(`[DEV] Error name: ${error.name}`);
      console.error(`[DEV] Error message: ${error.message}`);
      console.error(`[DEV] Error code: ${error.code || 'N/A'}`);
      console.error(`[DEV] Stack trace: ${error.stack}`);
    }
  }
}
