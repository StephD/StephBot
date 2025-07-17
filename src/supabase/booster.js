import supabase from '../utils/supabase.js';

/**
 * Get all boosters from the database
 * @returns {Promise<{success: boolean, data?: any[], error?: string}>}
 */
export async function getAllBoosters() {
  try {
    const { data, error } = await supabase
      .from('boosters')
      .select('*')
      .eq('active', true)
      .order('premium_since', { ascending: false });
    
    if (error) {
      throw new Error(error.message);
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching boosters:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a booster's in-game ID in the database
 * @param {string} discordId - The Discord ID of the user
 * @param {string} discordName - The Discord username
 * @param {string} gameId - The new in-game ID
 * @param {number|null} premiumSince - Timestamp when the user started boosting or null if not boosting
 * @returns {Promise<{success: boolean, message: string, data?: any}>}
 */
/**
 * Create a new booster in the database
 * @param {Object} boosterData - The booster data
 * @param {string} boosterData.discordId - The Discord ID of the user
 * @param {string} boosterData.discordName - The Discord username
 * @param {string} boosterData.gameId - The in-game ID
 * @param {number|null} boosterData.premiumSince - Timestamp when the user started boosting or null if not boosting
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.upsert=false] - If true, update the record if it already exists
 * @returns {Promise<{success: boolean, message: string, data?: any, error?: string}>}
 */
export async function createBooster({ discordId, discordName, gameId, premiumSince, discordNickname }, options = {}) {
  try {
    // Check if the booster already exists
    const { data: existingBooster, error: fetchError } = await supabase
      .from('boosters')
      .select('*')
      .eq('discord_id', discordId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      throw new Error(fetchError.message);
    }
    
    // If booster exists and upsert is false, return error
    if (existingBooster && !options.upsert) {
      return {
        success: false,
        message: 'Booster already exists',
        data: existingBooster
      };
    }
    
    // If booster exists and upsert is true, update it
    if (existingBooster && options.upsert) {
      return updateBoosterGameId(discordId, discordName, gameId, premiumSince);
    }
    
    // Create new booster
    const { data, error } = await supabase
      .from('boosters')
      .insert({
        discord_id: discordId,
        discord_name: discordName,
        discord_nickname: discordNickname,
        active: premiumSince ? true : false,
        game_id: gameId,
        premium_since: premiumSince ? new Date(premiumSince).toISOString().split('T')[0] : null,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw new Error(error.message);
    
    return {
      success: true,
      message: 'New booster added successfully',
      data
    };
  } catch (error) {
    console.error('Error creating booster:', error);
    return { 
      success: false, 
      message: `Failed to create booster: ${error.message}`,
      error: error.message 
    };
  }
}

/**
 * Update a booster's in-game ID in the database
 * @param {string} discordId - The Discord ID of the user
 * @param {string} discordName - The Discord username
 * @param {string} gameId - The new in-game ID
 * @param {number|null} premiumSince - Timestamp when the user started boosting or null if not boosting
 * @returns {Promise<{success: boolean, message: string, data?: any}>}
 */
/**
 * Get a booster by Discord ID
 * @param {string} discordId - The Discord ID to look up
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
export async function getBoosterByDiscordId(discordId) {
  try {
    const { data, error } = await supabase
      .from('boosters')
      .select('*')
      .eq('discord_id', discordId)
      .single();
    
    if (error) {
      // If no rows found, return success but with null data
      if (error.code === 'PGRST116') {
        return { success: true, data: null };
      }
      throw new Error(error.message);
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching booster by Discord ID:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Update a booster's in-game ID in the database
 * @param {string} discordId - The Discord ID of the user
 * @param {string} discordName - The Discord username
 * @param {string} gameId - The new in-game ID
 * @param {number|null} premiumSince - Timestamp when the user started boosting or null if not boosting
 * @returns {Promise<{success: boolean, message: string, data?: any}>}
 */
export async function updateBoosterGameId(discordId, discordName, gameId, premiumSince, discordNickname = null) {
  try {
    // First check if the booster exists
    const { data: existingBooster, error: fetchError } = await supabase
      .from('boosters')
      .select('*')
      .eq('discord_name', discordName)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      throw new Error(fetchError.message);
    }
    
    let result;
    
    if (existingBooster) {
      // Update existing booster
      const updateData = {
        game_id: gameId,
        active: premiumSince ? true : false,
        discord_name: discordName,
        discord_nickname: discordNickname,
        discord_id: discordId,
        premium_since: premiumSince ? new Date(premiumSince).toISOString().split('T')[0] : null,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('boosters')
        .update(updateData)
        .eq('discord_name', discordName)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      result = {
        success: true,
        message: 'Booster information updated successfully',
        data
      };
    } else {
      // Create new booster
      const insertData = {
        discord_id: discordId,
        discord_name: discordName,
        discord_nickname: discordNickname,
        game_id: gameId,
        active: premiumSince ? true : false,
        premium_since: premiumSince ? new Date(premiumSince).toISOString().split('T')[0] : null,
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('boosters')
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw new Error(error.message);
      
      result = {
        success: true,
        message: 'New booster added successfully',
        data
      };
    }
    
    return result;
  } catch (error) {
    console.error('Error updating booster:', error);
    return { success: false, message: `Failed to update booster: ${error.message}` };
  }
}

// update booster active status
export async function updateBoosterActive(discordId, active) {
  try {
    const { data, error } = await supabase
      .from('boosters')
      .update({ active })
      .eq('discord_id', discordId)
      .select()
      .single();
      
    if (error) throw new Error(error.message);
    
    return { success: true, message: 'Booster active status updated successfully', data };
  } catch (error) {
    console.error('Error updating booster active status:', error);
    return { success: false, message: `Failed to update booster active status: ${error.message}` };
  }
}