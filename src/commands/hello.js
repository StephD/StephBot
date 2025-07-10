export const data = {
  name: 'hello',
  description: 'Replies with a friendly hello message',
};

export async function execute(interaction) {
  await interaction.reply('👋 Hello! This is a basic Discord bot response.');
}
