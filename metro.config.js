const { getSentryExpoConfig } = require("@sentry/react-native/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

// By default Metro skips Babel transformation for all node_modules.
// Some packages use modern JS syntax (private class fields: #x, #y, …)
// that Hermes can't compile without downleveling. List them here so Babel
// processes them before the bundle hits Hermes.
config.transformer.transformIgnorePatterns = [
  'node_modules/(?!' +
  [
    'react-native',
    '@react-native',
    'expo',
    '@expo',
    '@unimodules',
    '@sentry/react-native',
    'react-native-svg',
    'react-native-reanimated',
    'react-native-gesture-handler',
    'react-native-screens',
    'react-native-safe-area-context',
    '@stripe/stripe-react-native',
    'react-native-qrcode-svg',
    'qrcode',           // ← uses private class fields (#x, #y, #width, #height)
    'react-native-worklets',
    'react-native-webview',
  ].join('|') +
  ').*',
];

module.exports = config;