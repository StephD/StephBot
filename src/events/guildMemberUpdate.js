export const name = 'guildMemberUpdate';
export const once = false;

export async function execute(oldMember, newMember, client) {
  try {
    // Check if roles were added
    if (oldMember.roles.cache.size < newMember.roles.cache.size) {
      // A role was added
      const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
      
      // Check specifically for the premium subscriber (booster) role
      // Discord automatically assigns a role called 'Server Booster' when someone boosts the server
      const premiumRole = newMember.guild.roles.premiumSubscriberRole;
      
      // Check if the added role is the premium subscriber role
      if (premiumRole && addedRoles.has(premiumRole.id)) {
        console.log(`${newMember.user.username} just boosted the server!`);
        
        // Get the booster-specific channel
        // Replace 'booster-channel-id' with your actual booster channel ID
        const boosterChannel = newMember.guild.channels.cache.get('1381474907548024882');
        
        if (boosterChannel) {
          // Send a welcome message in the booster channel
          await boosterChannel.send(
            `🎉 Welcome ${newMember.user} to the booster club! Thank you for supporting our server!\n\n` +
            `You now have access to exclusive perks including:\n` +
            `• Custom role colors\n` +
            `• Exclusive emotes\n` +
            `• Priority support\n` +
            `• And more!\n\n` +
            `Don't forget to use the /booster addme command to register your in-game ID.`
          );
        }
                
        // Send a DM to the user with instructions
        try {
          await newMember.user.send(
            `Thank you for boosting our server! 💖\n\n` +
            `You now have access to:\n` +
            `• The exclusive #booster-server channel\n` +
            `• Special commands and perks\n\n` 
            `If you have any questions, feel free to ask in the booster channel!`
          );
        } catch (error) {
          console.error('Could not send DM to booster:', error);
          // User might have DMs disabled - we'll just continue
        }
      }
    }
    
    // Handle when someone stops boosting (loses the premium subscriber role)
    if (oldMember.roles.cache.size > newMember.roles.cache.size) {
      const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
      const premiumRole = newMember.guild.roles.premiumSubscriberRole;
      
      if (premiumRole && removedRoles.has(premiumRole.id)) {
        console.log(`${newMember.user.username} is no longer boosting the server`);
        
        // You could update your database or send a notification to admins
        // For example, update the booster's status in your database to inactive
        
        // Optional: Send a message to a log channel
        const logChannel = newMember.guild.channels.cache.get('log-channel-id');
        if (logChannel) {
          await logChannel.send(
            `📉 ${newMember.user.tag} is no longer boosting the server.`
          );
        }
      }
    }
  } catch (error) {
    console.error('Error in guildMemberUpdate event:', error);
  }
}
