module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { reanimated: false }],
    ],
    plugins: [
      ['module-resolver', {
        root: ['.'],
        alias: { '@': './' },
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
      }],
      'react-native-worklets/plugin', // MUST be last
    ],
  };
};