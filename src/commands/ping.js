export const data = {
  name: 'ping',
  description: 'Replies with the bot latency',
};

export async function execute(interaction, client) {
  const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
  const latency = sent.createdTimestamp - interaction.createdTimestamp;
  await interaction.editReply(`Pong! Bot latency: ${latency}ms | API Latency: ${Math.round(client.ws.ping)}ms`);
}
