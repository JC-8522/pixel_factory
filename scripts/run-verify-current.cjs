const path = require("node:path");
const { pathToFileURL } = require("node:url");

const target = pathToFileURL(path.resolve(__dirname, "verify-current-app-ui.mjs")).href;
const keepAlive = setInterval(() => {}, 1000);

import(target)
  .then(() => {
    clearInterval(keepAlive);
    process.exit(0);
  })
  .catch((error) => {
    clearInterval(keepAlive);
    console.error(error);
    process.exit(1);
  });
