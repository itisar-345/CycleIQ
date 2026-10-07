module.exports = function (api) {
  api.cache(true);
  return {
    // zustand's ESM middleware reads `import.meta.env`, which the web bundle can't run as-is.
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
  };
};
