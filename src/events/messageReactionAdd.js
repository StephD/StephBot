export const name = 'messageReactionAdd';
export const once = false;

import { getBoosterByDiscordId, updateBoosterGameId } from '../supabase/booster.js';

// Store users who are currently in the game ID submission process
// This helps us track which users we're expecting DM responses from
const pendingGameIdSubmissions = new Map();

// Channel configuration defining allowed channels and their properties
const CHANNEL_NAMES = [
  'booster-only',
  'booster-commands',
  'playground-main-chat'
];

// The list of channel names where reactions are processed
const ALLOWED_REACTION_CHANNELS = CHANNEL_NAMES;

export async function execute(reaction, user, client) {
  // Define development mode flag
  const isDev = process.env.NODE_ENV === 'development';
  return;
  
  // Super verbose logging only in development mode
  if (isDev) {
    console.log(`[DEV] User Tag: ${user.tag || 'N/A'}`);
    console.log(`[DEV] Emoji: ${reaction.emoji.name} (ID: ${reaction.emoji.id || 'Standard emoji'})`);
    console.log(`[DEV] Message content preview: ${reaction.message.content ? reaction.message.content.substring(0, 30) + '...' : '[No content/embed]'}`);
    console.log(`[DEV] Channel: #${reaction.message.channel.name} (${reaction.message.channel.id})`);
  }

  try {
    // Don't process reactions from bots
    if (user.bot) return;
    
    // Check if this is a partial reaction or message (from an old message)
    // If it is, fetch the complete data
    if (reaction.partial || reaction.message.partial) {
      if (isDev) console.log('[DEV] Detected partial reaction or message, fetching complete data...');
      try {
        await reaction.fetch();
        if (reaction.message.partial) {
          await reaction.message.fetch();
        }
      } catch (error) {
        console.error('Error fetching partial data:', error);
        if (isDev) {
          console.error('[DEV] Error details:');
          console.error(`[DEV] Name: ${error.name}`);
          console.error(`[DEV] Message: ${error.message}`);
          console.error(`[DEV] Stack: ${error.stack}`);
        }
        return;
      }
      if (isDev) console.log('[DEV] Successfully fetched complete data');
    }

    // Check if the reaction is ⭐ (star emoji)
    if (isDev) console.log(`[DEV] Reaction emoji: ${reaction.emoji.name} (looking for ⭐)`); 
    if (reaction.emoji.name === '⭐') {
      // Check if the reaction is in one of the allowed channels by name
      const channelName = reaction.message.channel.name;
      if (!ALLOWED_REACTION_CHANNELS.includes(channelName)) {
        if (isDev) console.log(`[DEV] Reaction is not in an allowed channel. Channel: #${channelName}`);
        return;
      }
      if (isDev) console.log(`[DEV] Reaction is in an allowed channel #${channelName} ✓`);
      
      // Check if the message is pinned
      const message = reaction.message;
      if (isDev) {
        console.log(`[DEV] Message pinned status: ${message.pinned}`);
        console.log(`[DEV] Message creation time: ${new Date(message.createdTimestamp).toISOString()}`);
        console.log(`[DEV] Message author: ${message.author ? message.author.tag : 'Unknown'} (${message.author ? message.author.id : 'Unknown'})`);
      }
      
      if (!message.pinned) {
        if (isDev) console.log(`[DEV] Message is not pinned, ignoring reaction`);
        return;
      }
      
      // Get the guild member who reacted
      const guild = reaction.message.guild;
      if (isDev) {
        console.log(`[DEV] Guild ID: ${guild.id}, Guild Name: ${guild.name}`);
        console.log(`[DEV] Guild member count: ${guild.memberCount}`);
        console.log(`[DEV] Guild owner: ${guild.ownerId}`);
      }
      
      const member = guild.members.cache.get(user.id) || await guild.members.fetch(user.id);
      if (isDev) {
        console.log(`[DEV] Member fetched: ${member.displayName} (${member.id})`);
        console.log(`[DEV] Member joined: ${new Date(member.joinedTimestamp).toISOString()}`);
        console.log(`[DEV] Member roles: ${member.roles.cache.map(r => r.name).join(', ')}`);
      }
      
      // Check if user is a booster (has premium subscriber role)
      const premiumRole = guild.roles.premiumSubscriberRole;
      if (!premiumRole || !member.roles.cache.has(premiumRole.id)) {
        // Not a booster, remove their reaction
        console.log(`User ${user.username} (${user.id}) is not a booster, removing star reaction`);
        await reaction.users.remove(user.id);
        return;
      } else {
        console.log(`User ${user.username} (${user.id}) is a booster, allowing star reaction`);
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
    if (isDev) {
      console.error('[DEV] Detailed error information:');
      console.error(`[DEV] Error name: ${error.name}`);
      console.error(`[DEV] Error message: ${error.message}`);
      console.error(`[DEV] Stack trace: ${error.stack}`);
      console.error(`[DEV] Error occurred at: ${new Date().toISOString()}`);
    }
  }
}

// Export the pending submissions map so it can be accessed from the messageCreate event
export { pendingGameIdSubmissions };
