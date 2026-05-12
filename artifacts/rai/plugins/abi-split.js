/**
 * Config plugin: restricts APK to arm64-v8a only.
 * Modern Android devices (2017+) are all arm64.
 * Building only arm64 cuts APK size roughly in half vs building all 4 ABIs.
 */
const { withDangerousMod } = require("expo/config-plugins");
const path = require("path");
const fs = require("fs");

module.exports = function withAbiSplit(config) {
  return withDangerousMod(config, [
    "android",
    (config) => {
      const appBuildGradlePath = path.join(
        config.modRequest.platformProjectRoot,
        "app",
        "build.gradle"
      );

      if (!fs.existsSync(appBuildGradlePath)) return config;

      let content = fs.readFileSync(appBuildGradlePath, "utf8");

      if (content.includes("splits {")) return config;

      const splitsBlock = `
    splits {
        abi {
            enable true
            reset()
            include "arm64-v8a"
            universalApk false
        }
    }
`;

      content = content.replace(/(buildTypes\s*\{)/, `${splitsBlock}\n    $1`);
      fs.writeFileSync(appBuildGradlePath, content, "utf8");
      return config;
    },
  ]);
};
