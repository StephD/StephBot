// Simple index route to verify deployment
export default function handler(req, res) {
  res.status(200).json({
    status: 'online',
    message: 'Discord bot API is running! Use the /api/interactions endpoint for Discord interactions.',
    timestamp: new Date().toISOString()
  });
}
