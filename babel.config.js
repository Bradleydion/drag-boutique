module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Map @/ to the project root so imports like @/components/X work everywhere
      ['module-resolver', {
        root: ['.'],
        alias: {
          '@': '.',
        },
      }],
      // react-native-worklets for animation support
      "react-native-worklets/plugin",
    ],
  };
};
