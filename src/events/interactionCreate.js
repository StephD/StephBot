export const name = 'interactionCreate';
export const once = false;

export async function execute(interaction, client) {
  // Handle slash commands
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);

    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }

    try {
      await command.execute(interaction, client);
    } catch (error) {
      console.error(`Error executing ${interaction.commandName} command:`, error);
      
      // Respond to the user with an error message if the interaction is still valid
      const errorReply = { content: 'There was an error executing this command.', ephemeral: true };
      
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(errorReply);
      } else {
        await interaction.reply(errorReply);
      }
    }
  }
  
  // Handle button interactions
  // Note: We don't need to handle button interactions here because they're handled
  // by the collector in the command that created the button
  // This is just for any future global button handlers that aren't tied to specific commands
  else if (interaction.isButton()) {
    // Button interactions are handled by collectors in their respective commands
    // This section would be for any global buttons not tied to a specific command
    console.log(`Button interaction received: ${interaction.customId}`);
  }
  
  // Handle other interaction types as needed
  // else if (interaction.isSelectMenu()) { ... }
  // else if (interaction.isModalSubmit()) { ... }
  // etc.
}
