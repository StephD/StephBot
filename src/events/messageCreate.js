export const name = 'messageCreate';
export const once = false;

import { updateBoosterGameId } from '../supabase/booster.js';
import { pendingGameIdSubmissions } from './messageReactionAdd.js';

// Configuration for restricted channels
const CHANNEL_CONFIGS = {
  // Channel name as key, array of allowed commands as value
  // If array is empty, all slash commands are allowed, but regular text is still deleted
  'booster-commands': ['/booster me', '/booster addme'],
  // 'booster-only': [], // Empty array means all slash commands allowed
  // 'command-channel': [] // Example of another channel with no command restrictions
};

export async function execute(message, client) {
  // Log all messages received for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEBUG] messageCreate event triggered: ${message.author.username} (${message.author.id}) in ${message.guild ? `guild channel #${message.channel.name}` : 'DM'}`);
  }
  try {
    // Ignore messages from bots
    if (message.author.bot) return;
    
    // Check if the message is in a restricted channel (by channel name)
    if (message.channel && message.channel.name in CHANNEL_CONFIGS) {
      // Get the allowed commands for this channel
      const allowedCommands = CHANNEL_CONFIGS[message.channel.name];
      
      // If allowedCommands array is empty, all slash commands are allowed but we still delete regular text
      // Otherwise, check if the message matches one of the allowed commands
      const isAllowedCommand = allowedCommands.length === 0 ? 
        false : // If empty array, no text commands allowed, only actual slash commands
        allowedCommands.some(cmd => message.content.toLowerCase().startsWith(cmd.toLowerCase()));
      
      
      // If it's not an allowed command format, delete it
      if (!isAllowedCommand) {
        try {
          await message.delete();
          
          // Send a temporary warning message
          const warningMsg = await message.channel.send({
            content: 'This channel only accepts `/booster me` and `/booster addme game_id ...` commands.',
            ephemeral: true // Try to make it ephemeral, though regular messages can't be truly ephemeral
          });
          
          // Delete the warning after 5 seconds
          setTimeout(() => {
            warningMsg.delete().catch(err => console.error('Could not delete warning message:', err));
          }, 5000);
        } catch (error) {
          console.error('Error deleting unauthorized message:', error);
        }
        
        // Exit early since we've handled this message
        return;
      }
    }
    
    // Check if this is a DM (Direct Message)
    if (!message.guild) {
      console.log(`[DEBUG] Message is a DM from ${message.author.username} (${message.author.id})`);
      const userId = message.author.id;
      
      // Check if this user has a pending game ID submission
      console.log(`[DEBUG] Checking if user ${userId} has pending game ID submission: ${pendingGameIdSubmissions.has(userId) ? 'Yes' : 'No'}`);
      console.log(`[DEBUG] Current pending submissions: ${Array.from(pendingGameIdSubmissions.keys()).join(', ')}`);
      if (pendingGameIdSubmissions.has(userId)) {
        // Get the pending submission data
        const submissionData = pendingGameIdSubmissions.get(userId);
        
        // Extract the game ID from the message content
        const gameId = message.content.trim();
        console.log(`[DEBUG] Received game ID: ${gameId} from user ${message.author.username}`);
        
        // Validate the game ID - you can add more validation if needed
        if (!gameId || gameId.length < 3) {
          await message.reply('⚠️ Your game ID seems too short. Please provide a valid game ID that is at least 3 characters long.');
          return;
        }
        
        // Update the booster's game ID in the database
        console.log(`[DEBUG] Updating database with game ID for user ${message.author.username}`);
        const { success, message: dbMessage } = await updateBoosterGameId(
          userId,
          message.author.username,
          gameId,
          submissionData.premiumSince,
          submissionData.displayName
        );
        
        if (success) {
          console.log(`[DEBUG] Database update successful for user ${message.author.username}`);
          // Send confirmation message to the user
          await message.reply(
            '✅ Thank you! Your game ID has been successfully registered.\n\n' +
            `Game ID: \`${gameId}\`\n\n` +
            'You can update your game ID at any time by reacting with 👍 to the pinned message again.'
          );
          
          // Try to remove the user's reaction from the original message
          console.log(`[DEBUG] Attempting to remove reaction from original message`);
          try {
            const guild = client.guilds.cache.get(submissionData.guildId);
            if (guild) {
              const channel = guild.channels.cache.get(submissionData.channelId);
              if (channel) {
                const originalMessage = await channel.messages.fetch(submissionData.messageId);
                const reaction = originalMessage.reactions.cache.find(r => r.emoji.name === '👍');
                if (reaction) {
                  await reaction.users.remove(userId);
                  console.log(`Removed reaction from user ${message.author.username} (${userId})`);
                }
              }
            }
          } catch (error) {
            console.error('Error removing reaction:', error);
            // Continue anyway as the important part (DB update) was successful
          }
          
          // Remove the user from the pending submissions map
          console.log(`[DEBUG] Removing user ${message.author.username} from pending submissions map`);
          pendingGameIdSubmissions.delete(userId);
          
          // Log the successful registration
          console.log(`User ${message.author.username} (${userId}) registered game ID: ${gameId}`);
        } else {
          // Handle database error
          await message.reply(
            '❌ Sorry, there was an error saving your game ID. Please try again later or contact an admin.\n\n' +
            `Error: ${dbMessage}`
          );
          console.error(`Error updating game ID for user ${message.author.username} (${userId}):`, dbMessage);
        }
      }
    }
  } catch (error) {
    console.error('Error in messageCreate event:', error);
  }
}
