import { registerCommands } from '../utils/commandRegistration.js';

export const name = 'ready';
export const once = true;

export async function execute(client) {
  try {
    // This function is called when the client emits the 'ready' event
    // Log that the bot is ready
    console.log(`🚀 Ready! Logged in as ${client.user.tag}`);
    
    // Register slash commands when the bot is ready
    await registerCommands(client);
    
    console.log('Bot initialization complete!');
  } catch (error) {
    console.error('Error in ready event:', error);
  }
}
