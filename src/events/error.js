export const name = 'error';
export const once = false;

export function execute(error) {
  console.error('Discord client error:', error);
}
