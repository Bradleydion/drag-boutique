module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      "expo-router/babel",
      [
        "module-resolver",
        {
          root: ["./src"],
          alias: {
            "@": "./src",
            "@components": "./src/components",
            "@lib": "./src/lib",
            "@hooks": "./src/hooks",
            "@theme": "./src/theme",
            "@types": "./src/types",
          },
        },
      ],
      // If you use worklets / reanimated, keep this last:
      "react-native-worklets/plugin",
      // or "react-native-reanimated/plugin" depending on your setup
    ],
  };
};