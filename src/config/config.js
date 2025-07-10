import 'dotenv/config';

export const config = {
  // Discord Bot Configuration
  token: process.env.DISCORD_TOKEN,
  appId: process.env.APP_ID,
  
  // Client Options
  clientOptions: {
    intents: [
      'Guilds',
      'GuildMessages',
      'MessageContent'
    ]
  }
};
