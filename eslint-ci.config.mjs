import eslintrc from "./eslint.config.mjs";

export default eslintrc.map((config) => {
  if (config.ignores) {
    return config;
  }

  let newRules = {};

  for (const key of Object.keys(config.rules ?? {})) {
    newRules[key] = config.rules[key] !== "off" ? "error" : "off";
  }

  newRules = {
    ...newRules,
    indent: "off",
  };

  return {
    ...config,
    rules: newRules,
  };
});
