import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const stagingRoot = path.join(projectRoot, "release", ".builder-app");
const stagingNodeModulesRoot = path.join(stagingRoot, "node_modules");

const packageJson = JSON.parse(await readFile(path.join(projectRoot, "package.json"), "utf8"));
const minimalAppPackage = {
  name: packageJson.name,
  version: packageJson.version,
  private: true,
  type: "module",
  packageManager: "npm@10.9.0",
  main: "out/main/index.js"
};

await rm(stagingRoot, { recursive: true, force: true });
await mkdir(stagingNodeModulesRoot, { recursive: true });
await cp(path.join(projectRoot, "out"), path.join(stagingRoot, "out"), { recursive: true, dereference: true });
await cp(path.join(projectRoot, "node_modules", "sql.js"), path.join(stagingNodeModulesRoot, "sql.js"), {
  recursive: true,
  dereference: true
});
await writeFile(path.join(stagingRoot, "package.json"), `${JSON.stringify(minimalAppPackage, null, 2)}\n`, "utf8");

console.log(
  JSON.stringify(
    {
      stagingRoot,
      copiedRuntimeDependency: "sql.js"
    },
    null,
    2
  )
);
