import { registerCommands } from '../utils/commandRegistration.js';

export const name = 'ready';
export const once = true;

export async function execute(client) {
  try {
    client.once('ready', () => {
      console.log(`🚀 Ready! Logged in as ${client.user.tag}`);
    });
    
    // Register slash commands when the bot is ready
    await registerCommands(client);
  } catch (error) {
    console.error('Error in ready event:', error);
  }
}
