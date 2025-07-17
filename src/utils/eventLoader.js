import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export async function loadEvents(client) {
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const eventsPath = path.join(__dirname, '..', 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    const eventNames = [];
    
    for (const file of eventFiles) {
      try {
        const filePath = `file://${path.join(eventsPath, file)}`;
        const event = await import(filePath);
        
        if ('name' in event && 'execute' in event) {
          if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
          } else {
            client.on(event.name, (...args) => event.execute(...args, client));
          }
          eventNames.push(event.name);
        } else {
          console.warn(`⚠️ The event at ${file} is missing required properties.`);
        }
      } catch (error) {
        console.error(`❌ Error loading event from ${file}:`, error);
      }
    }
    
    console.log(`✅ Event loaded: ${eventNames.join(' / ')}`);
  } catch (error) {
    console.error('❌ Error loading events:', error);
  }
}
