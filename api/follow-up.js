import 'dotenv/config';
import { DiscordRequest } from '../utils.js';

// This endpoint handles follow-up messages for Discord interactions
// Since Vercel serverless functions terminate after sending a response,
// we need a separate endpoint for follow-up actions
export default async function handler(req, res) {
  try {
    // Only allow POST requests with proper authorization
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Basic authentication check - in production, use a more secure method
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { interaction_token, app_id, message_id, content, components } = req.body;
    
    if (!interaction_token || !app_id) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Construct the endpoint for the follow-up message
    const endpoint = message_id 
      ? `webhooks/${app_id}/${interaction_token}/messages/${message_id}` 
      : `webhooks/${app_id}/${interaction_token}/messages/@original`;

    // Make the request to Discord
    const discordResponse = await DiscordRequest(endpoint, {
      method: message_id ? 'PATCH' : 'POST',
      body: {
        content: content,
        components: components || []
      }
    });

    return res.status(200).json({ 
      success: true, 
      discord_response: await discordResponse.json() 
    });
  } catch (error) {
    console.error('Error in follow-up handler:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message 
    });
  }
}
