export const name = 'guildMemberUpdate';
export const once = false;

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

// Custom booster role name for testing
const CUSTOM_BOOSTER_ROLE_NAME = 'Booster';

export async function execute(oldMember, newMember, client) {
  try {
    // Development mode logging
    if (isDev) {
      console.log(`\n[DEV] guildMemberUpdate event triggered`);
      console.log(`[DEV] Member: ${newMember.user.tag} (${newMember.id})`);
    }
    
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
        console.log(`${newMember.user.username} just boosted the server!`);
        
        // Get the booster-specific channel
        const boosterChannel = newMember.guild.channels.cache.get('1390238588410793984');
        
        if (isDev) {
          console.log(`[DEV] Looking for booster channel: ${boosterChannel ? 'Found' : 'Not found'}`);
          if (boosterChannel) {
            console.log(`[DEV] Channel: ${boosterChannel.name} (${boosterChannel.id})`);
          }
        }
        
        if (boosterChannel) {
          // Send a welcome message in the booster channel
          const welcomeMessage = `🎉 Welcome ${newMember.user} to the booster club! Thank you for supporting our server!\n\n`;
          
          await boosterChannel.send(welcomeMessage);
          console.log(`Sent welcome message in channel ${boosterChannel.name} for ${newMember.user.tag}`);
        }
                
        // Send a DM to the user with instructions
        try {
          const dmMessage = `Thank you for boosting our server! 💖\n\n` +
            `If you have any questions, feel free to ask in the booster channel!`;
          
          await newMember.user.send(dmMessage);
          console.log(`Sent DM to ${newMember.user.tag}`);
        } catch (error) {
          console.error('Could not send DM to booster:', error);
        }
      }
    }
    
    // Handle when someone stops boosting (loses the premium subscriber role)
    if (oldMember.roles.cache.size > newMember.roles.cache.size) {
      const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
      const premiumRole = newMember.guild.roles.premiumSubscriberRole;
      
      // Check for removed custom Booster role
      const customBoosterRole = removedRoles.find(role => role.name === CUSTOM_BOOSTER_ROLE_NAME);
      
      // If either the premium role or custom role was removed, handle the removal
      if ((premiumRole && removedRoles.has(premiumRole.id)) || customBoosterRole) {
        // Process the removal with one of the roles (prefer premium if both exist)
        const roleToUse = (premiumRole && removedRoles.has(premiumRole.id)) ? premiumRole : customBoosterRole;
        await handleBoostRemoval(newMember, client, roleToUse);
      }
      
      // Helper function to handle boost removal
      async function handleBoostRemoval(newMember, client, role) {
        console.log(`${newMember.user.username} is no longer boosting the server`);
        
        // Send a message to a log channel
        const logChannel = newMember.guild.channels.cache.get('1395253829905285181');
        if (logChannel) {
          const message = `📉 ${newMember.user.tag} is no longer boosting the server.`;
          await logChannel.send(message);
          console.log(`Sent boost removal message in log channel for ${newMember.user.tag}`);
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
