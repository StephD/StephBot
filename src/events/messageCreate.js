export const name = 'messageCreate';
export const once = false;

import { updateBoosterGameId } from '../supabase/booster.js';
import { isValidGameId } from '../utils/index.js';

const isDev = process.env.NODE_ENV === 'development';
// Array of compliments for random responses
const COMPLIMENTS = [
  "You're absolutely amazing!",
  "Your messages always brighten my day!",
  "You have a wonderful way with words!",
  "I'm impressed by your creativity!",
  "You're doing a fantastic job!",
  "Your ideas are brilliant!",
  "You're a ray of sunshine in this server!",
  "Your presence here makes everything better!",
  "You're incredibly talented!",
  "I appreciate your contributions so much!",
  "Your energy is contagious in the best way possible!",
  "You have such a unique and valuable perspective!",
  "I'm so glad you're part of this community!",
  "Your kindness doesn't go unnoticed!",
  "You're making a positive difference here!",
  "Your enthusiasm is truly inspiring!",
  "You bring so much value to our conversations!",
  "Your thoughtfulness is remarkable!",
  "You have a gift for making others feel welcome!",
  "Your contributions are always insightful!",
  "You're a true gem in this server!",
  "Your positive attitude is refreshing!",
  "You're the kind of person everyone wants to be around!",
  "Your messages are always worth reading!",
  "You make this place better just by being here!"
];

// Configuration for restricted channels
const CHANNEL_CONFIGS = {
  // Channel name as key, array of allowed commands as value
  // If array is empty, all slash commands are allowed, but regular text is still deleted
  'booster-commands': ['/booster me', '/booster addme']
  // 'booster-only': [], // Empty array means all slash commands allowed
  // 'command-channel': [] // Example of another channel with no command restrictions
};

/**
 * Get a random compliment from the compliments array
 * @returns {string} A random compliment
 */
function getRandomCompliment() {
  const randomIndex = Math.floor(Math.random() * COMPLIMENTS.length);
  return COMPLIMENTS[randomIndex];
}

export async function execute(message, client) {
  // Log all messages received for debugging
  // if (process.env.NODE_ENV === 'development') {
  //   console.log(`[DEBUG] messageCreate event triggered: ${message.author.username} (${message.author.id}) in ${message.guild ? `guild channel #${message.channel.name}` : 'DM'}`);
  // }
  try {
    // Ignore messages from bots
    if (message.author.bot) return;
    
    // In development mode, randomly send a compliment (1/50 chance)
    if (isDev) {
      // Roll a dice (1/50 chance)
      if (Math.floor(Math.random() * 10) === 0) {
        const compliment = getRandomCompliment();
        await message.reply(`✨ ${compliment} ✨`);
      }
    }
    
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

      if(isDev) {
        console.log(`[DEBUG] Message is a DM from ${message.author.username} (${message.author.id})`);
        console.log(`[DEBUG] Received game ID: ${gameId} from user ${message.author.username}`);
      }
        
      if (!isValidGameId(gameId)) {
        await message.reply('⚠️ Your game ID seems too short. Please provide a valid game ID that is at least 28 characters long.');
        return;
      }
      
      if(isDev) {
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
          
        if(isDev) {
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
