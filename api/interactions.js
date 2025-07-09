import 'dotenv/config';
import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
  verifyKey,
} from 'discord-interactions';
import { getRandomEmoji, DiscordRequest, callExternalApi } from '../utils.js';
import { getShuffledOptions, getResult } from '../game.js';

// Store for in-progress games. In production, you'd want to use a DB
const activeGames = {};

export default async function handler(req, res) {
  // Only process POST requests
  if (req.method !== 'POST') {
    return res.status(405).send({ error: 'Method not allowed' });
  }
  
  // Verify the request with Discord
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const rawBody = JSON.stringify(req.body);
  
  const isValidRequest = verifyKey(
    rawBody,
    signature,
    timestamp,
    process.env.PUBLIC_KEY
  );
  
  if (!isValidRequest) {
    return res.status(401).send({ error: 'Bad request signature' });
  }
  
  // Interaction type and data
  const { type, id, data } = req.body;
  
  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.status(200).json({ type: InteractionResponseType.PONG });
  }
  
  /**
   * Handle slash command requests
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;
    
    // "testapi" command
    if (name === 'testapi') {
      try {
        // Get the URL from the command options
        const apiUrl = data.options[0].value;
        
        // Send an initial response to acknowledge the command
        return res.status(200).json({
          type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
        });
        
        // NOTE: For follow-up messages, you'll need to implement a separate API endpoint
        // or use a solution like webhook.site to handle Discord's follow-up messages
        // since Vercel serverless functions terminate after sending a response.
      } catch (error) {
        console.error('Error handling testapi command:', error);
        
        return res.status(200).json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
            components: [
              {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: `Error: ${error.message}`
              }
            ]
          },
        });
      }
    }
    
    // "test" command
    if (name === 'test') {
      // Send a message into the channel where command was triggered from
      return res.status(200).json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              // Fetches a random emoji to send from a helper function
              content: `hello world ${getRandomEmoji()}`
            }
          ]
        },
      });
    }
    
    // "challenge" command
    if (name === 'challenge' && id) {
      // Interaction context
      const context = req.body.context;
      // User ID is in user field for (G)DMs, and member for servers
      const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
      // User's object choice
      const objectName = req.body.data.options[0].value;
      
      // Create active game using message ID as the game ID
      activeGames[id] = {
        id: userId,
        objectName,
      };
      
      return res.status(200).json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              // Fetches a random emoji to send from a helper function
              content: `Rock papers scissors challenge from <@${userId}>`,
            },
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.BUTTON,
                  // Append the game ID to use later on
                  custom_id: `accept_button_${req.body.id}`,
                  label: 'Accept',
                  style: ButtonStyleTypes.PRIMARY,
                },
              ],
            },
          ],
        },
      });
    }
    
    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }
  
  /**
   * Handle requests from interactive components
   */
  if (type === InteractionType.MESSAGE_COMPONENT) {
    // custom_id set in payload when sending message component
    const componentId = data.custom_id;
    
    if (componentId.startsWith('accept_button_')) {
      // get the associated game ID
      const gameId = componentId.replace('accept_button_', '');
      
      return res.status(200).json({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          // Indicates it'll be an ephemeral message
          flags: InteractionResponseFlags.EPHEMERAL | InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: 'What is your object of choice?',
            },
            {
              type: MessageComponentTypes.ACTION_ROW,
              components: [
                {
                  type: MessageComponentTypes.STRING_SELECT,
                  // Append game ID
                  custom_id: `select_choice_${gameId}`,
                  options: getShuffledOptions(),
                },
              ],
            },
          ],
        },
      });
      
      // Note: In serverless, we can't delete previous messages here
      // We'd need a separate endpoint for follow-up actions
    } else if (componentId.startsWith('select_choice_')) {
      // get the associated game ID
      const gameId = componentId.replace('select_choice_', '');
      
      if (activeGames[gameId]) {
        // Interaction context
        const context = req.body.context;
        // Get user ID and object choice for responding user
        // User ID is in user field for (G)DMs, and member for servers
        const userId = context === 0 ? req.body.member.user.id : req.body.user.id;
        const objectName = data.values[0];
        // Calculate result from helper function
        const resultStr = getResult(activeGames[gameId], {
          id: userId,
          objectName,
        });
        
        // Remove game from storage
        delete activeGames[gameId];
        
        // Send results
        return res.status(200).json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { 
            flags: InteractionResponseFlags.IS_COMPONENTS_V2,
            components: [
              {
                type: MessageComponentTypes.TEXT_DISPLAY,
                content: resultStr
              }
            ]
          },
        });
      }
    }
    
    return res.status(200).end();
  }
  
  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
}
