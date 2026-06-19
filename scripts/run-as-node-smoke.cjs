const fs = require("node:fs");
const path = require("node:path");

const target = path.resolve(process.cwd(), "verification", "run-as-node-smoke.txt");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, "ok");
console.log(target);
