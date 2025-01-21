// Reference: https://github.com/souporserious/bundling-typescript-with-esbuild-for-npm

const { build } = require("esbuild");
const { dependencies, peerDependencies } = require("./package.json");

const entryFile = "src/index.ts";
const shared = {
  bundle: true,
  platform: "node",
  entryPoints: [entryFile],
  external: [...Object.keys(dependencies), ...Object.keys(peerDependencies)],
  logLevel: "info",
  sourcemap: true,
  target: ["esnext", "node22.13.1"],
};

build({
  ...shared,
  format: "esm",
  outfile: "./dist/index.esm.js",
});

build({
  ...shared,
  format: "cjs",
  outfile: "./dist/index.cjs.js",
});
