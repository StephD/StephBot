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
    // if (isDev) {
    //   console.log(`\n[DEV] guildMemberUpdate event triggered`);
    //   console.log(`[DEV] Member: ${newMember.user.tag} (${newMember.id})`);
    // }

    const boosterLogChannel = newMember.guild.channels.cache.find(channel => BOOSTER_LOG_CHANNEL_NAME.includes(channel.name));
    
    if (oldMember.roles.cache.size < newMember.roles.cache.size) {
      const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
      
      // if (isDev) {
      //   console.log(`[DEV] Roles added: ${addedRoles.map(r => r.name).join(', ')}`);
      // }
      
      const premiumRole = newMember.guild.roles.premiumSubscriberRole;
      const customBoosterRole = addedRoles.find(role => role.name === CUSTOM_BOOSTER_ROLE_NAME);

      if (isDev) {
        // console.log(`[DEV] Is premium: ${premiumRole} || Is custom booster: ${customBoosterRole}`);
      }
      
      if (premiumRole || customBoosterRole) {
        const roleToUse = premiumRole || customBoosterRole;
        // if (isDev) {
        //   console.log(`[DEV] Using role: ${roleToUse.name}`);
        // }
        await handleBoost(newMember, client, roleToUse);
      }
      
      async function handleBoost(newMember, client, role) {
        if (boosterLogChannel) {
          await boosterLogChannel.send(`🎉 ${new Date().toISOString().split('T')[1]} ${newMember.user.globalName} (${newMember.user.tag}) just boosted the server!\n` + 'Is he premium? ' + (premiumRole?'Yes':'No') + ' || or custom role? ' + (customBoosterRole?'Yes':'No'));
        }
        
        const boosterChannel = newMember.guild.channels.cache.get(BOOSTER_CHANNEL_NAME);
                
        const sendBoosterChannelMsg = false;
        if (boosterChannel && sendBoosterChannelMsg) {
          await boosterChannel.send(`🎉 Welcome ${newMember.user.globalName} to the booster club! Thank you for supporting our server!\n\n`);
        }

        // Add the booster to the database
        const { success, message } = await createBooster({
          discordId: newMember.id,
          discordName: newMember.user.username,
          gameId: '',
          premiumSince: newMember.premiumSinceTimestamp,
          discordNickname: newMember.user.globalName
        });
        if (!success) {
          if (message.includes('already exists')) {
            const { success, message } = await updateBoosterActive(newMember.id, true);
            if (!success) {
              console.error('Error updating booster:', message);
            } else {
              await boosterLogChannel.send(`✅ ${newMember.user.globalName} has been enabled to the booster list!`);
            }
          } else {
            console.error('Error creating booster:', message);
          }
        } else {
          await boosterLogChannel.send(`✅ ${newMember.user.globalName} has been added to the booster list!`);
        }
                
        const sendDM = false;
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
    
    if (oldMember.roles.cache.size > newMember.roles.cache.size) {
      const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

      // if (isDev) {
      //   console.log(`[DEBUG] Removed roles: ${removedRoles.map(r => r.name).join(', ')}`);
      // }

      const premiumRole = newMember.guild.roles.premiumSubscriberRole;
      const customBoosterRole = removedRoles.find(role => role.name === CUSTOM_BOOSTER_ROLE_NAME);
      
      // if (isDev) {
      //   console.log(`[DEBUG] Is premium: ${premiumRole} || Is custom booster: ${customBoosterRole}`);
      // }
      
      if (premiumRole || customBoosterRole) {
        if (boosterLogChannel) {
          await boosterLogChannel.send(`📉 ${new Date().toISOString().split('T')[1]} ${newMember.user.globalName} (${newMember.user.tag}) is no longer boosting the server!\n` + 'Is he premium? ' + (premiumRole?'Yes':'No') + ' || Is custom booster? ' + (customBoosterRole?'Yes':'No'));
        }
      
        const { success, message } = await updateBoosterActive(newMember.id, false);
        if (!success) {
          console.error('Error updating booster active status:', message);
        } else {
          await boosterLogChannel.send(`✅ ${newMember.user.globalName} has been disabled from the booster list!`);
        }
      }
    }
  } catch (error) {
    console.error('Error in guildMemberUpdate event:', error);
    if (isDev) {
      console.error('[DEV] Detailed error information:');
      console.error(`[DEV] Error name: ${error.name}`);
      console.error(`[DEV] Error message: ${error.message}`);
      console.error(`[DEV] Stack trace: ${error.stack}`);
    }
  }
}
