// check if a string is a valid game ID
export function isValidGameId(gameId) {
  return /^[a-zA-Z0-9]{28}$/.test(gameId);
}