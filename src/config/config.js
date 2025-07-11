import 'dotenv/config';

export const config = {
  // Discord Bot Configuration
  token: process.env.DISCORD_TOKEN,
  appId: process.env.APP_ID,
  guildId: process.env.GUILD_ID, // Add this for guild-specific command registration
  
  // Client Options
  clientOptions: {
    intents: [
      'Guilds',
      'GuildMessages',
      'MessageContent'
    ]
  }
};
