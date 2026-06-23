const path = require("node:path");
const { pathToFileURL } = require("node:url");

const target = pathToFileURL(path.resolve(__dirname, "run-electron-ui-verification.mjs")).href;
const verifyScript = path.resolve(__dirname, "verify-current-app-ui.mjs");
const keepAlive = setInterval(() => {}, 1000);
const previousArgv = process.argv.slice();
process.argv = [previousArgv[0], previousArgv[1], verifyScript];

import(target)
  .then(() => {
    process.argv = previousArgv;
    clearInterval(keepAlive);
    process.exit(0);
  })
  .catch((error) => {
    process.argv = previousArgv;
    clearInterval(keepAlive);
    console.error(error);
    process.exit(1);
  });
