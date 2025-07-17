export const name = 'guildMemberUpdate';
export const once = false;

import { updateBoosterActive, createBooster } from '../supabase/booster.js';
import { Colors } from '../utils/colors.js';

const isDev = process.env.NODE_ENV === 'development';
const CUSTOM_BOOSTER_ROLE_NAME = 'Booster';
const BOOSTER_LOG_CHANNEL_NAME = ['bot-logs', 'booster-log', 'bot-test'];
const BOOSTER_CHANNEL_NAME = 'booster-only'; 

export async function execute(oldMember, newMember, client) {
  try {
    let botLogChannel = null;
    let editDB = true
    let sendToBoosterChannel = false
    let sendDM = false
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
      // if (isDev) {
      //   console.log(`[DEBUG] ---- Role update detected for ${newMember.user.globalName || newMember.user.username} (${newMember.user.tag})`);
      // }
      const premiumRole = newMember.guild.roles.premiumSubscriberRole;
      // console.log(`[DEBUG] Premium role: ${premiumRole.name} (${premiumRole.id})`);

      const isAdd = oldMember.roles.cache.size < newMember.roles.cache.size;
      const isRemove = oldMember.roles.cache.size > newMember.roles.cache.size;
      
      if (isAdd) {
        const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
        console.log(`[DEBUG] Added roles: ${addedRoles.map(r => r.name).join(', ')}`);
        
        const isPremiumAdded = premiumRole && addedRoles.some(role => role.id === premiumRole.id);
        console.log(`[DEBUG] Is premium role added: ${isPremiumAdded ? 'Yes' : 'No'}`);
        const customBoosterRole = addedRoles.find(role => role.name === CUSTOM_BOOSTER_ROLE_NAME);
        console.log(`[DEBUG] Is custom booster role added: ${customBoosterRole ? 'Yes' : 'No'}`); 
        
        if (isPremiumAdded || customBoosterRole) {
          console.log(`[DEBUG] I will add ${newMember.user.globalName || newMember.user.username} to the booster list`); 
          
          const messageNewBoost = `🎉 ${new Date().toISOString().split('T')[1]} ${newMember.user.globalName || newMember.user.username} (${newMember.user.tag}) just boosted the server!\n` + 'Is he premium? ' + (isPremiumAdded ? 'Yes' : 'No') + ' || or custom booster role? ' + (customBoosterRole ? 'Yes' : 'No');
          
          if (botLogChannel) {
            await botLogChannel.send(messageNewBoost);
          } else {
            console.log(messageNewBoost);
          }
          
          if (sendToBoosterChannel) {
            try {
            boosterChannel = newMember.guild.channels.cache.find(channel => 
              channel.name === BOOSTER_CHANNEL_NAME && 
              channel.permissionsFor(client.user).has(['ViewChannel', 'SendMessages'])
            );
            
            if (!boosterChannel && isDev) {
                console.log(`[DEV] No suitable booster channel found with proper permissions`);
              }
            } catch (error) {
              console.error('Error finding booster channel:', error.message);
            }
          }
                  
          if (editDB) {
            const { success, message } = await createBooster({
              discordId: newMember.id,
              discordName: newMember.user.username,
              gameId: '',
              premiumSince: newMember.premiumSinceTimestamp,
              discordNickname: newMember.user.globalName
            });

            if (!success) {
              if (message.includes('already exists')) {
                console.log(`[DEBUG] ${newMember.user.globalName || newMember.user.username} is already in the booster list`);

                const { success, message } = await updateBoosterActive(newMember.id, true);
                if (!success) {
                  console.error('Error updating booster:', message);
                } else {
                  const enabledMessage = `✅ ${newMember.user.globalName || newMember.user.username} has been enabled to the booster list!`;
                  if (botLogChannel) {
                    await botLogChannel.send(enabledMessage);
                  }else{
                    console.log(enabledMessage);
                  }
                }
              } else {
                console.error('Error creating booster:', message);
              }
            } else {
              const addedMessage = `✅ ${newMember.user.globalName || newMember.user.username} has been added to the booster list!`;
              if (botLogChannel) {
                await botLogChannel.send(addedMessage);
              }else{
                console.log(addedMessage);
              }
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
        console.log(`[DEBUG] Removed roles: ${removedRoles.map(r => r.name).join(', ')}`);
        
        const isPremiumRemoved = premiumRole && removedRoles.some(role => role.id === premiumRole.id);
        console.log(`[DEBUG] Is premium role removed: ${isPremiumRemoved ? 'Yes' : 'No'}`); 
        const customBoosterRole = removedRoles.find(role => role.name === CUSTOM_BOOSTER_ROLE_NAME);
        console.log(`[DEBUG] Is custom booster role removed: ${customBoosterRole ? 'Yes' : 'No'}`);
        
        if (isPremiumRemoved || customBoosterRole) {
          console.log(`[DEBUG] I will remove ${newMember.user.globalName || newMember.user.username} from the booster list`);

          const unboostMessage = `❌ ${new Date().toISOString().split('T')[1]} ${newMember.user.globalName || newMember.user.username} (${newMember.user.tag}) is no longer boosting the server!\n` + 'Is premium removed? ' + (isPremiumRemoved?'Yes':'No') + ' || Is custom booster removed? ' + (customBoosterRole?'Yes':'No');
                        
          if (botLogChannel) {
            await botLogChannel.send(unboostMessage);
          }else{
            console.log(unboostMessage);
          }
        
          if (editDB) {
            const { success, message } = await updateBoosterActive(newMember.id, false);
            if (!success) {
              console.error('Error updating booster active status:', message);
            }
          }
          
          const disabledMessage = `✅ ${newMember.user.globalName || newMember.user.username} has been disabled from the booster list!`;
          if (botLogChannel) {
            await botLogChannel.send(disabledMessage);
          }else{
            console.log(disabledMessage);
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
