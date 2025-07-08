import 'dotenv/config';
import { getRPSChoices } from './game.js';
import { capitalize, InstallGlobalCommands } from './utils.js';

// Get the game choices from game.js
function createCommandChoices() {
  const choices = getRPSChoices();
  const commandChoices = [];

  for (let choice of choices) {
    commandChoices.push({
      name: capitalize(choice),
      value: choice.toLowerCase(),
    });
  }

  return commandChoices;
}

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Command for testing API calls
const TEST_API_COMMAND = {
  name: 'testapi',
  description: 'Call an API and return the result',
  options: [
    {
      type: 3,
      name: 'url',
      description: 'The API URL to call',
      required: true,
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

// Command containing options
const CHALLENGE_COMMAND = {
  name: 'challenge',
  description: 'Challenge to a match of rock paper scissors',
  options: [
    {
      type: 3,
      name: 'object',
      description: 'Pick your object',
      required: true,
      choices: createCommandChoices(),
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 2],
};

const ALL_COMMANDS = [TEST_COMMAND, CHALLENGE_COMMAND, TEST_API_COMMAND];

console.log('Registering commands with Discord API:', ALL_COMMANDS);
try {
  InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS)
    .then(() => console.log('Commands registered successfully!'))
    .catch(err => console.error('Error registering commands:', err));
} catch (error) {
  console.error('Exception during command registration:', error);
}
