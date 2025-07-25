import { executeWelcome } from '../commands/booster/welcome.js';

export const name = 'interactionCreate';
export const once = false;

// Handle interactions
// This is the main event handler for all interactions
// It handles slash commands, button interactions, and other types of interactions
// It is called for every interaction that is created

export async function execute(interaction, client) {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      // console.log(`Executing command: ${interaction.commandName}`);
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName} command:`, error);
      
      // Respond to the user with an error message if the interaction is still valid
      const errorReply = { content: 'There was an error executing this command.', flags: ['Ephemeral'] };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorReply);
      } else {
        await interaction.reply(errorReply);
      }
    }
  }
  
  // Handle button interactions - PERMANENT BUTTONS
  else if (interaction.isButton()) {
    try {
      // Handle welcome command buttons
      if (interaction.customId === 'booster_welcome_me' || interaction.customId === 'booster_welcome_addme') {
        await executeWelcome(interaction, client);
      }
      // Add more permanent button handlers here as needed
      // else if (interaction.customId === 'support_ticket') { ... }
      // else if (interaction.customId === 'other_button') { ... }
      else {
        console.log(`Unhandled button interaction: ${interaction.customId}`);
      }
    } catch (error) {
      console.error(`Error handling button interaction ${interaction.customId}:`, error);
      
      const errorReply = { content: 'There was an error processing your request.', flags: ['Ephemeral'] };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorReply);
      } else {
        await interaction.reply(errorReply);
      }
    }
  }
  
  // Handle modal submissions - PERMANENT MODALS
  else if (interaction.isModalSubmit()) {
    try {
      // Handle welcome command modal submissions
      if (interaction.customId === 'booster_gameIdModal') {
        await executeWelcome(interaction, client);
      }
      // Add more modal handlers here as needed
      else {
        console.log(`Unhandled modal submission: ${interaction.customId}`);
      }
    } catch (error) {
      console.error(`Error handling modal submission ${interaction.customId}:`, error);
      
      const errorReply = { content: 'There was an error processing your submission.', flags: ['Ephemeral'] };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorReply);
      } else {
        await interaction.reply(errorReply);
      }
    }
  }
  
  // Handle other interaction types as needed
  // else if (interaction.isSelectMenu()) { ... }
}
