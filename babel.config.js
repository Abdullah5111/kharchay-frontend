module.exports = function (api) {
  api.cache(true);
  // NativeWind v4 uses jsxImportSource + the metro plugin (see metro.config.js);
  // the v2-era "nativewind/babel" preset was removed and breaks bundling.
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
  };
};
