/**
 * Role configuration for different servers
 * 
 * This file contains role configurations for different Discord servers.
 * You can define roles by name or ID for each server.
 */

// Default configuration for all servers
const defaultRoles = {
  // Define roles by name (case-sensitive)
  adminRoleNames: ['Admin', 'Administrator', 'Owner', 'Server Owner'],
  boosterManagerRoleNames: ['Booster Manager', 'Mod', 'Moderator'],
  
  // You can also define specific role IDs that should have access regardless of server
  // These should be used sparingly, mainly for your own roles across servers
  globalAdminIds: [],
  globalBoosterManagerIds: []
};

// Server-specific configurations (override or extend defaults)
// Keys are server/guild IDs
const serverRoles = {
  // Example for a specific server
  '123456789012345678': {
    adminRoleNames: ['Server Admin', 'Head Mod'], // Will be merged with default adminRoleNames
    boosterManagerRoleNames: ['Booster Team'], // Will be merged with default boosterManagerRoleNames
    // You can also specify exact role IDs for this server
    adminRoleIds: ['987654321098765432'],
    boosterManagerRoleIds: ['876543210987654321']
  }
  // Add more servers as needed
};

/**
 * Get role configuration for a specific server
 * @param {string} guildId - The Discord server/guild ID
 * @returns {Object} - Role configuration for the server
 */
export function getRoleConfig(guildId) {
  // Get server-specific config or empty object if not found
  const serverConfig = serverRoles[guildId] || {};
  
  // Merge with default config
  return {
    adminRoleNames: [...defaultRoles.adminRoleNames, ...(serverConfig.adminRoleNames || [])],
    boosterManagerRoleNames: [...defaultRoles.boosterManagerRoleNames, ...(serverConfig.boosterManagerRoleNames || [])],
    adminRoleIds: [...defaultRoles.globalAdminIds, ...(serverConfig.adminRoleIds || [])],
    boosterManagerRoleIds: [...defaultRoles.globalBoosterManagerIds, ...(serverConfig.boosterManagerRoleIds || [])]
  };
}

/**
 * Check if a user has admin permissions based on roles
 * @param {GuildMember} member - The guild member to check
 * @returns {boolean} - True if the member has admin permissions
 */
export function isAdmin(member) {
  if (!member) return false;
  
  // Get role config for this server
  const roleConfig = getRoleConfig(member.guild.id);
  
  // Check role IDs
  const hasAdminRoleId = roleConfig.adminRoleIds.some(roleId => 
    member.roles.cache.has(roleId)
  );
  
  if (hasAdminRoleId) return true;
  
  // Check role names
  const hasAdminRoleName = member.roles.cache.some(role => 
    roleConfig.adminRoleNames.includes(role.name)
  );
  
  return hasAdminRoleName;
}

/**
 * Check if a user has booster manager permissions based on roles
 * @param {GuildMember} member - The guild member to check
 * @returns {boolean} - True if the member has booster manager permissions
 */
export function isBoosterManager(member) {
  if (!member) return false;
  
  // Get role config for this server
  const roleConfig = getRoleConfig(member.guild.id);
  
  // Check role IDs
  const hasManagerRoleId = roleConfig.boosterManagerRoleIds.some(roleId => 
    member.roles.cache.has(roleId)
  );
  
  if (hasManagerRoleId) return true;
  
  // Check role names
  const hasManagerRoleName = member.roles.cache.some(role => 
    roleConfig.boosterManagerRoleNames.includes(role.name)
  );
  
  return hasManagerRoleName;
}

/**
 * Check if a user has any of the specified permissions
 * @param {GuildMember} member - The guild member to check
 * @param {string[]} permissions - Array of permission types to check ('admin', 'boosterManager')
 * @returns {boolean} - True if the member has any of the specified permissions
 */
export function hasPermission(member, permissions = []) {
  if (!member || !permissions.length) return false;
  
  if (permissions.includes('admin') && isAdmin(member)) return true;
  if (permissions.includes('boosterManager') && isBoosterManager(member)) return true;
  
  return false;
}

export default {
  getRoleConfig,
  isAdmin,
  isBoosterManager,
  hasPermission
};
