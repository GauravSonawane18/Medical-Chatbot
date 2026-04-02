// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-status-bar
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

// Silence act() warnings in tests
global.console = {
  ...console,
  error: (msg, ...args) => {
    if (typeof msg === 'string' && msg.includes('act(')) return;
    console.error(msg, ...args);
  },
};
