export const name = 'messageCreate';
export const once = false;

import { updateBoosterGameId } from '../supabase/booster.js';
import { isValidGameId } from '../utils/index.js';

// Configuration for restricted channels
const CHANNEL_CONFIGS = {
  // Channel name as key, array of allowed commands as value
  // If array is empty, all slash commands are allowed, but regular text is still deleted
  'booster-commands': ['/booster me', '/booster addme']
  // 'booster-only': [], // Empty array means all slash commands allowed
  // 'command-channel': [] // Example of another channel with no command restrictions
};

export async function execute(message, client) {
  // Log all messages received for debugging
  // if (process.env.NODE_ENV === 'development') {
  //   console.log(`[DEBUG] messageCreate event triggered: ${message.author.username} (${message.author.id}) in ${message.guild ? `guild channel #${message.channel.name}` : 'DM'}`);
  // }
  try {
    // Ignore messages from bots
    if (message.author.bot) return;
    
    // Check if the message is in a restricted channel (by channel name)
    // Disable the feature for all message
    if (false && message.channel && message.channel.name in CHANNEL_CONFIGS) {
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
      const userId = message.author.id;
      const gameId = message.content.trim();

      if(process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] Message is a DM from ${message.author.username} (${message.author.id})`);
        console.log(`[DEBUG] Received game ID: ${gameId} from user ${message.author.username}`);
      }
        
      if (!isValidGameId(gameId)) {
        await message.reply('⚠️ Your game ID seems too short. Please provide a valid game ID that is at least 28 characters long.');
        return;
      }
      
      if(process.env.NODE_ENV === 'development') {
        console.log(`[DEBUG] Updating database with game ID for user ${message.author.username}`);
        console.log(`Adding booster: ${message.author.id}, ${message.author.username}, ${gameId}, ${message.author.premiumSince}, ${message.author.globalName}`);
      }
      
      const { success, message: dbMessage } = await updateBoosterGameId(
        message.author.id,
        message.author.username,
        gameId,
        message.author.premiumSince,
        message.author.globalName
      );
        
      if (success) {
        await message.reply(
          '✅ Thank you! Your game ID has been successfully registered.\n\n' +
          `Game ID: \`${gameId}\`\n\n`
        );
          
        if(process.env.NODE_ENV === 'development') {
          console.log(`User ${message.author.username} (${userId}) registered game ID: ${gameId}`);
        }
      } else {
        await message.reply(
          '❌ Sorry, there was an error saving your game ID. Please try again later or contact an admin.\n\n' +
          `Error: ${dbMessage}`
        );
      }
    }
  } catch (error) {
    console.error('Error in messageCreate event:', error);
  }
}
