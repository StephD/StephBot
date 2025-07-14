/**
 * Color constants for embeds
 * These colors are used across the bot for consistent styling
 */
export const Colors = {
  // Brand colors
  PRIMARY: '#5865F2',      // Discord Blurple
  SECONDARY: '#2D3136',    // Discord Dark
  
  // Status colors
  SUCCESS: '#57F287',      // Green
  ERROR: '#ED4245',        // Red
  WARNING: '#FEE75C',      // Yellow
  INFO: '#5865F2',         // Blue (same as PRIMARY)
  
  // Role colors
  ADMIN: '#D980FA',        // Light Purple
  MODERATOR: '#5B8FB9',    // Light Blue
  BOOSTER: '#F47FFF',      // Pink (same as Discord Nitro)
  
  // Special colors
  GOLD: '#FFD700',         // Gold for premium features
  SILVER: '#C0C0C0',       // Silver for special mentions
  BRONZE: '#CD7F32',       // Bronze for tertiary elements
  
  // Gradient colors (for special embeds)
  GRADIENT_START: '#8A2BE2', // Violet
  GRADIENT_END: '#FF69B4'    // Pink
};

/**
 * Get a random color from the Colors object
 * @returns {string} A random color hex code
 */
export function getRandomColor() {
  const colorValues = Object.values(Colors);
  return colorValues[Math.floor(Math.random() * colorValues.length)];
}

/**
 * Get a color based on status
 * @param {string} status - The status ('success', 'error', 'warning', 'info')
 * @returns {string} The corresponding color hex code
 */
export function getStatusColor(status) {
  switch (status.toLowerCase()) {
    case 'success': return Colors.SUCCESS;
    case 'error': return Colors.ERROR;
    case 'warning': return Colors.WARNING;
    case 'info': return Colors.INFO;
    default: return Colors.PRIMARY;
  }
}
