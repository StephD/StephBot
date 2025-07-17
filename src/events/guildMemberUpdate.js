export const name = 'guildMemberUpdate';
export const once = false;

import { updateBoosterActive } from '../supabase/booster.js';

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

// Custom booster role name for testing
const CUSTOM_BOOSTER_ROLE_NAME = 'Booster';
// booster-log channel name
const BOOSTER_LOG_CHANNEL_NAME = 'booster-log';
// booster channel name
const BOOSTER_CHANNEL_NAME = 'booster-only';

export async function execute(oldMember, newMember, client) {
  try {
    // Development mode logging
    if (isDev) {
      console.log(`\n[DEV] guildMemberUpdate event triggered`);
      console.log(`[DEV] Member: ${newMember.user.tag} (${newMember.id})`);
    }

    const boosterLogChannel = newMember.guild.channels.cache.find(channel => channel.name === BOOSTER_LOG_CHANNEL_NAME);
    
    // Check if roles were added
    if (oldMember.roles.cache.size < newMember.roles.cache.size) {
      // A role was added
      const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
      
      if (isDev) {
        console.log(`[DEV] Roles added: ${addedRoles.map(r => r.name).join(', ')}`);
      }
      
      // Check specifically for the premium subscriber (booster) role
      // Discord automatically assigns a role called 'Server Booster' when someone boosts the server
      const premiumRole = newMember.guild.roles.premiumSubscriberRole;
      const customBoosterRole = addedRoles.find(role => role.name === CUSTOM_BOOSTER_ROLE_NAME);
      
      // If either the premium role or custom role was added, handle the boost
      if ((premiumRole && addedRoles.has(premiumRole.id)) || customBoosterRole) {
        // Process the boost with one of the roles (prefer premium if both exist)
        const roleToUse = (premiumRole && addedRoles.has(premiumRole.id)) ? premiumRole : customBoosterRole;
        await handleBoost(newMember, client, roleToUse);
      }
      
      // Helper function to handle the boost
      async function handleBoost(newMember, client, role) {
        // send log message
        if (boosterLogChannel) {
          await boosterLogChannel.send(`🎉 ${newMember.user.tag} just boosted the server!`);
        }
        
        // Get the booster-specific channel
        const boosterChannel = newMember.guild.channels.cache.get(BOOSTER_CHANNEL_NAME);
        
        if (isDev) {
          console.log(`[DEV] Looking for booster channel: ${boosterChannel ? 'Found' : 'Not found'}`);
          if (boosterChannel) {
            console.log(`[DEV] Channel: ${boosterChannel.name} (${boosterChannel.id})`);
          }
        }
        
        // Check if we should send a channel message
        const sendChannelMsg = false; // You can set this to false if you don't want channel messages
        
        if (boosterChannel && sendChannelMsg) {
          await boosterChannel.send(`🎉 Welcome ${newMember.user} to the booster club! Thank you for supporting our server!\n\n`);
        }
                
        // Check if we should send a DM
        const sendDM = true; // You can set this to false if you don't want DMs
        
        // Send a DM to the user with instructions
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
    
    // Handle when someone stops boosting (loses the premium subscriber role)
    if (oldMember.roles.cache.size > newMember.roles.cache.size) {
      const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));

      if (isDev) {
        console.log(`[DEBUG] Removed roles: ${removedRoles.map(r => r.name).join(', ')}`);
      }

      const premiumRole = newMember.guild.roles.premiumSubscriberRole;
      
      // Check for removed custom Booster role
      const customBoosterRole = removedRoles.find(role => role.name === CUSTOM_BOOSTER_ROLE_NAME);
      
      // If either the premium role or custom role was removed, handle the removal
      if ((premiumRole && removedRoles.has(premiumRole.id)) || customBoosterRole) {
        if (boosterLogChannel) {
          await boosterLogChannel.send(`📉 ${newMember.user.tag} is no longer boosting the server.`);
        }
      
        const { success, message } = await updateBoosterActive(newMember.id, false);
        if (!success) {
          console.error('Error updating booster active status:', message);
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
