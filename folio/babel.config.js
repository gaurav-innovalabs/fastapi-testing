// babel-preset-expo (SDK 58) adds the react-native-worklets plugin itself, as
// the last plugin, when the package is installed (Reanimated 4 setup), so no
// manual 'react-native-reanimated/plugin' entry is needed here.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
