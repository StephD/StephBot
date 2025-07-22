export const name = 'messageCreate';
export const once = false;

import { updateBoosterGameId } from '../supabase/booster.js';
import { isValidGameId } from '../utils/index.js';
import { EmbedBuilder } from 'discord.js';
import { Colors } from '../utils/colors.js';

const isDev = process.env.NODE_ENV === 'development';
const CUSTOM_BOOSTER_ROLE_NAME = 'Booster';
const BOOSTER_LOG_CHANNEL_NAME = ['booster-log'];

// Array of bad words and negative language to detect (only in development mode)
const CURSED_WORDS = [
  // Common curse words
  'fuck', 'fk', 'shit', 'damn', 'ass', 'asshole', 'bitch',
  'wtf', 'stfu', 'crap', 'hell', 'idiot', 'stupid', 'dumb', 'loser',
  'garbage', 'trash', 'worthless', 'useless', 'sucks', 'terrible', 'awful',
  'hate', 'worst', 'pathetic', 'disgusting', 'nasty', 'bs', 'bullshit', 'fu', 'fck',
  
  // Sexual terms
  'boobs', 'dick', 'penis', 'vagina', 'pussy', 'cock', 'tits', 'nipples',
  'cum', 'jizz', 'sperm', 'semen', 'orgasm', 'horny', 'masturbate', 'blowjob', 'suck',
  'handjob', 'anal', 'dildo', 'vibrator', 'fleshlight', 'buttplug', 'bdsm',
  'bondage', 'fetish', 'kink', 'erection', 'erect', 'precum', 'climax',
  'ejaculate', 'hentai', 'porn', 'pornography', 'xxx', 'nsfw', 'milf',
  'whore', 'slut', 'hooker', 'prostitute', 'escort', 'stripper', 'nude',
  'naked', 'fap', 'wank', 'fingering', 'rimjob', 'creampie', 'gangbang',
  'orgy', 'threesome', 'foursome', 'cunt', 'twat', 'prick', 'ballsack',
  'testicle', 'scrotum', 'anus', 'rectum', 'taint', 'groin', 'clit', 'clitoris',
  'labia', 'vulva', 'foreskin', 'shaft', 'balls', 'nutsack', 'jerk off'
];

// Array of sassy responses to bad language (only in development mode)
const CURSED_RESPONSES = [
  'Whoa there! Someone\'s feeling spicy today... 🌶️',
  'Did your keyboard just get possessed by a sailor? 🧂',
  'I see you\'ve chosen violence today... 💢',
  'That\'s quite the colorful vocabulary you\'ve got there! 🌈',
  'Someone woke up and chose chaos this morning... ⚡',
  'Your message is rated R for Really unnecessary language... 🙄',
  'I\'m going to pretend I didn\'t see that... 👀',
  'Who hurt you today? Need to talk about it? 🤔',
  'That\'s a lot of negative energy for one message... 📉',
  'Do you kiss your mother with that mouth? 💋',
  'Yikes! Maybe take a deep breath? 😮‍💨',
  'Let\'s try that again but with 100% less attitude... 📝',
  'Detected: Keyboard rage in progress... 💻💥',
  'Your autocorrect must be having a meltdown right now... 🔥',
  'My poor innocent circuits weren\'t prepared for that... 🤖'
];

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

/**
 * Normalize text by replacing common leetspeak/number substitutions
 * @param {string} text - The text to normalize
 * @returns {string} Normalized text
 */
function normalizeLeetspeak(text) {
  return text
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/ph/g, 'f')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's')
    .replace(/!/g, 'i')
    .replace(/\+/g, 't')
    .replace(/\(/g, 'c')
    .replace(/\)/g, 'o')
    .replace(/v4g/g, 'vag')
    .replace(/p3n/g, 'pen')
    .replace(/d1c/g, 'dic')
    .replace(/b00/g, 'boo')
    .replace(/t1t/g, 'tit');
}

/**
 * Checks if a message contains cursed content
 * @param {string} messageContent - The message content to check
 * @param {string} userId - The user ID to check special handling for
 * @returns {boolean} True if the message contains cursed content
 */
function hasCursedContent(messageContent, userId) {
  // First normalize the message to catch leetspeak variations
  const normalizedMessage = normalizeLeetspeak(messageContent.toLowerCase());
  
  // Special handling for specific user ID - allow curse words to be part of other words
  if (userId === '138637909933686784') {
    return CURSED_WORDS.some(word => normalizedMessage.includes(word));
  }
  
  // For everyone else, create a regex pattern to match whole words only (with word boundaries)
  return CURSED_WORDS.some(word => {
    // Create a regex with word boundaries (\b) to match only whole words
    const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
    return wordRegex.test(normalizedMessage);
  });
}

/**
 * Get a random cursed response
 * @returns {string} A random cursed response
 */
function getRandomCursedResponse() {
  const randomIndex = Math.floor(Math.random() * CURSED_RESPONSES.length);
  return CURSED_RESPONSES[randomIndex];
}

export async function execute(message, client) {
  // Log all messages received for debugging
  // if (process.env.NODE_ENV === 'development') {
  //   console.log(`[DEBUG] messageCreate event triggered: ${message.author.username} (${message.author.id}) in ${message.guild ? `guild channel #${message.channel.name}` : 'DM'}`);
  // }
  try {
    // Ignore messages from bots
    if (message.author.bot) return;
    let funCursed = false
    let funCompliment = false
    
    // In development mode only
    if (isDev) {
      try {
        const userId = message.author.id;
        
        // Check for cursed content first
        if (funCursed && hasCursedContent(message.content, userId)) {
          // Special handling for specific user ID
          if (userId === '138637909933686784') {
            // Delete the message silently
            try {
              await message.delete();
            } catch (error) {
              console.error('Error deleting message from special user:', error);
            }
            return;
          }
          
          // Regular response for other users
          const cursedResponse = getRandomCursedResponse();
          await message.reply(cursedResponse);
          // Early return to prevent other responses for cursed messages
          return;
        }
        
        // If not cursed, randomly send a compliment (1/10 chance)
        if (funCompliment && Math.floor(Math.random() * 10) === 0) {
          const compliment = getRandomCompliment();
          await message.reply(`✨ ${compliment} ✨`);
        }
      } catch (error) {
        console.error('Error in dev mode message handling:', error);
        // Continue execution - don't let dev features break core functionality
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
        // embed error  
        const errorEmbed = new EmbedBuilder()
          .setColor(Colors.ERROR)
          .setTitle('❌ Invalid Game ID')
          .setDescription('⚠️ Your game ID seems too short or incorrect. Please provide a valid game ID that is at least 28 characters long and only contains letters and numbers.')
        await message.reply({ embeds: [errorEmbed] });
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
      
      // Initialize botLogChannel
      let botLogChannel = null;
      
      // For DMs, we need to search all guilds since message.guild is null
      try {
        // Search through all guilds the bot is in to find a booster-log channel
        for (const guild of message.client.guilds.cache.values()) {
          const foundChannel = guild.channels.cache.find(channel => 
            BOOSTER_LOG_CHANNEL_NAME.includes(channel.name) && 
            channel.permissionsFor(message.client.user).has(['ViewChannel', 'SendMessages'])
          );
          
          if (foundChannel) {
            botLogChannel = foundChannel;
            break; // Stop searching once we find a suitable channel
          }
        }
        
        if (!botLogChannel) {
          console.log(`No suitable booster log channel found with proper permissions`);
        }
      } catch (error) {
        console.error('Error finding booster log channel:', error.message);
      }
        
      if (success) {
        // Send a nicer DM response with embed
        const successEmbed = new EmbedBuilder()
          .setColor(Colors.SUCCESS)
          .setTitle('✅ Game ID Successfully Registered')
          .setDescription('Thank you! Your game ID has been added to our booster database.')
          // .addFields(
          //   { name: 'What\'s Next?', value: 'You\'re all set! Your booster perks will be activated shortly.', inline: false }
          // )
          .setFooter({ text: 'Thank you for supporting our server!' })
          
        await message.reply({ embeds: [successEmbed] });
          
        if(isDev) {
          console.log(`User ${message.author.username} (${userId}) registered game ID: ${gameId}`);
        }
        
        // Send embed to booster-log channel if found
        if (botLogChannel) {
          const logEmbed = new EmbedBuilder()
            .setColor(Colors.BOOSTER)
            .setTitle('💎 Booster Game ID Added via DM')
            .setDescription(`**${message.author.globalName || message.author.username}** has added their game ID via direct message`)
            .addFields(
              { name: 'User', value: `<@${userId}> (${message.author.tag})`, inline: true },
              { name: 'In-Game ID', value: gameId, inline: true },
              { name: 'Database Status', value: '✅ Successfully added to database', inline: false }
            )
            .setFooter({ text: 'Booster database updated successfully' })
          
          await botLogChannel.send({ embeds: [logEmbed] });
        }
      } else {
        // Send error embed as DM response
        const errorEmbed = new EmbedBuilder()
          .setColor(Colors.ERROR)
          .setTitle('❌ Error Saving Game ID')
          .setDescription('Sorry, there was an error saving your game ID.')
          .addFields(
            { name: 'Error Details', value: dbMessage, inline: false },
            { name: 'What to Do', value: 'Please try again later or contact a server admin for assistance.', inline: false }
          )
          
        await message.reply({ embeds: [errorEmbed] });
        
        // Send error embed to booster-log channel if found
        if (botLogChannel) {
          const errorLogEmbed = new EmbedBuilder()
            .setColor(Colors.ERROR)
            .setTitle('❌ Booster Game ID Error via DM')
            .setDescription(`Failed to add game ID for **${message.author.globalName || message.author.username}** via direct message`)
            .addFields(
              { name: 'User', value: `<@${userId}> (${message.author.tag})`, inline: true },
              { name: 'Attempted Game ID', value: gameId, inline: true },
              { name: 'Error', value: dbMessage, inline: false }
            )
            .setFooter({ text: 'Database operation failed' })
            .setTimestamp();
          
          await botLogChannel.send({ embeds: [errorLogEmbed] });
        }
      }
    }
  } catch (error) {
    console.error('Error in messageCreate event:', error);
  }
}
