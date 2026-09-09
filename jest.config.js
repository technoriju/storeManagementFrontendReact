module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!(jest-)?react-native|@react-native|@react-native-community|@react-native-async-storage/async-storage)/',
  ],
  setupFiles: ['<rootDir>/jest.setup.js'],
};
