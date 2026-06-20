module.exports = function (api) {
  api.cache(true);
  const isTest = process.env.NODE_ENV === "test";
  if (isTest) {
    return {
      presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    };
  }
  return {
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }], "nativewind/babel"],
  };
};
