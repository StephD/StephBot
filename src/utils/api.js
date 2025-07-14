/**
 * Call an external API and return the response
 * @param {string} url - The URL to call
 * @returns {Promise<{success: boolean, data?: any, error?: string, status?: number, statusText?: string}>}
 */
export async function callExternalApi(url) {
  try {
    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { success: false, error: 'Invalid URL format. URL must start with http:// or https://' };
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });
    
    // Check if the response is JSON
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }
    
    return { 
      success: response.ok, 
      data,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    console.error('API call error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Format API response data for Discord message
 * @param {any} data - The data to format
 * @param {number} maxLength - Maximum length before truncating
 * @returns {string} - Formatted string
 */
export function formatApiResponse(data, maxLength = 1900) {
  try {
    // Format the response data
    const formattedData = typeof data === 'object' 
      ? JSON.stringify(data, null, 2)
      : data.toString();
    
    // Truncate if too long (Discord has a 2000 character limit)
    return formattedData.length > maxLength
      ? formattedData.substring(0, maxLength) + '... (truncated)'
      : formattedData;
  } catch (error) {
    console.error('Error formatting API response:', error);
    return `Error formatting response: ${error.message}`;
  }
}
