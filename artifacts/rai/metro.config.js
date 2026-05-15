const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "define-properties": path.resolve(__dirname, "../../node_modules/define-properties"),
  "object-is": path.resolve(__dirname, "../../node_modules/object-is"),
};

module.exports = config;
