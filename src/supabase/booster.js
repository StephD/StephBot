import supabase from '../utils/supabase.js';

/**
 * Get all boosters from the database
 * @returns {Promise<{success: boolean, data?: any[], error?: string}>}
 */
export async function getAllBoosters() {
  try {
    const { data, error } = await supabase
      .from('boosters')
      .select('*');
    
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
 * @param {string} igId - The new in-game ID
 * @param {number|null} premiumSince - Timestamp when the user started boosting or null if not boosting
 * @returns {Promise<{success: boolean, message: string, data?: any}>}
 */
export async function updateBoosterIgId(discordId, discordName, igId, premiumSince) {
  try {
    // First check if the booster exists
    const { data: existingBooster, error: fetchError } = await supabase
      .from('boosters')
      .select('*')
      .eq('discord_id', discordId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned" error
      throw new Error(fetchError.message);
    }
    
    let result;
    
    if (existingBooster) {
      // Update existing booster
      const { data, error } = await supabase
        .from('boosters')
        .update({
          ig_id: igId,
          discord_name: discordName,
          premium_since: premiumSince ? new Date(premiumSince).toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('discord_id', discordId)
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
      const { data, error } = await supabase
        .from('boosters')
        .insert({
          discord_id: discordId,
          discord_name: discordName,
          ig_id: igId,
          premium_since: premiumSince ? new Date(premiumSince).toISOString() : null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
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