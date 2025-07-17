export const name = 'messageReactionAdd';
export const once = false;

import { getBoosterByDiscordId, updateBoosterGameId } from '../supabase/booster.js';

// Store users who are currently in the game ID submission process
// This helps us track which users we're expecting DM responses from
const pendingGameIdSubmissions = new Map();

export async function execute(reaction, user, client) {
  console.log(`[DEBUG] messageReactionAdd event triggered for user: ${user.tag || user.username} (${user.id})`);
  try {
    // Don't process reactions from bots
    if (user.bot) return;
    
    // Check if this is a partial reaction (from an old message)
    // If it is, fetch the complete data
    if (reaction.partial) {
      try {
        await reaction.fetch();
      } catch (error) {
        console.error('Error fetching partial reaction:', error);
        return;
      }
    }

    // Check if the reaction is 📋 (clipboard emoji)
    console.log(`[DEBUG] Reaction emoji: ${reaction.emoji.name} (looking for 📋)`); 
    if (reaction.emoji.name === '📋') {
      // Check if the message is pinned
      const message = reaction.message;
      console.log(`[DEBUG] Message pinned status: ${message.pinned}`);
      if (!message.pinned) {
        console.log(`[DEBUG] Message is not pinned, ignoring reaction`);
        return;
      }
      
      // Get the guild member who reacted
      const guild = reaction.message.guild;
      console.log(`[DEBUG] Guild ID: ${guild.id}, Guild Name: ${guild.name}`);
      const member = guild.members.cache.get(user.id) || await guild.members.fetch(user.id);
      console.log(`[DEBUG] Member fetched: ${member.displayName} (${member.id})`);
      
      // Check if user is a booster (has premium subscriber role)
      const premiumRole = guild.roles.premiumSubscriberRole;
      if (!premiumRole || !member.roles.cache.has(premiumRole.id)) {
        // Not a booster, remove their reaction
        console.log(`User ${user.username} (${user.id}) is not a booster, removing clipboard reaction`);
        await reaction.users.remove(user.id);
        return;
      } else {
        console.log(`User ${user.username} (${user.id}) is a booster, allowing clipboard reaction`);
      }
      
      // Check if the user is already in the database
      console.log(`[DEBUG] Checking if user exists in database: ${user.id}`);
      const { data: booster } = await getBoosterByDiscordId(user.id);
      console.log(`[DEBUG] User database status: ${booster ? 'Found in database' : 'Not found in database'}`);
      
      // Send a DM to the user asking for their game ID
      console.log(`[DEBUG] Attempting to send DM to user ${user.username}`);
      try {
        const dm = await user.send(
          '👋 Thanks for your interest in registering your game ID!\n\n' +
          'Please reply to this message with your in-game ID so we can add it to our database.'
        );
        
        // Store the user in our pending map with message details
        pendingGameIdSubmissions.set(user.id, {
          messageId: reaction.message.id,
          channelId: reaction.message.channelId,
          guildId: guild.id,
          timestamp: Date.now(),
          premiumSince: member.premiumSince ? member.premiumSince.getTime() : Date.now(),
          displayName: member.displayName || user.username,
          username: user.username
        });
        
        console.log(`User ${user.username} (${user.id}) started game ID submission process`);
        
      } catch (error) {
        console.error(`Could not send DM to user ${user.username}:`, error);
        // User might have DMs disabled
        
        // Try to send a response in the channel if possible
        try {
          // Send ephemeral message to the user explaining they need to enable DMs
          // This would require a message component or interaction, which this event doesn't support
          // Instead, we just remove their reaction
          await reaction.users.remove(user.id);
        } catch (removeError) {
          console.error('Error removing reaction:', removeError);
        }
      }
    }
  } catch (error) {
    console.error('Error in messageReactionAdd event:', error);
  }
}

// Export the pending submissions map so it can be accessed from the messageCreate event
export { pendingGameIdSubmissions };
