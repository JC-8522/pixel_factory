import { readdir, readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import type { DatabaseClient } from "../db/client";
import { upsertSkill, type SkillRecord } from "../db/repositories";
import { parseSkillMarkdown } from "./parseSkillMarkdown";

export type ScanSkillsOptions = {
  roots?: string[];
  projectRoot?: string;
};

export const defaultSkillRoots = (projectRoot = process.cwd()): string[] => [
  join(homedir(), ".codex", "skills"),
  join(projectRoot, ".codex", "skills"),
  join(projectRoot, "skills")
];

const findSkillFiles = async (root: string): Promise<string[]> => {
  try {
    const rootStat = await stat(root);
    if (!rootStat.isDirectory()) {
      return [];
    }
  } catch {
    return [];
  }

  const found: string[] = [];
  const entries = await readdir(root, { withFileTypes: true });

  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      const skillPath = join(path, "SKILL.md");
      try {
        const skillStat = await stat(skillPath);
        if (skillStat.isFile()) {
          found.push(skillPath);
        }
      } catch {
        found.push(...(await findSkillFiles(path)));
      }
    }
  }

  return found;
};

export const scanSkills = async (
  client: DatabaseClient,
  options: ScanSkillsOptions = {}
): Promise<SkillRecord[]> => {
  const roots = [...new Set((options.roots ?? defaultSkillRoots(options.projectRoot)).map((root) => resolve(root)))];
  const records: SkillRecord[] = [];

  for (const root of roots) {
    const skillFiles = await findSkillFiles(root);

    for (const skillMdPath of skillFiles) {
      try {
        const markdown = await readFile(skillMdPath, "utf8");
        const skillDir = dirname(skillMdPath);
        const parsed = parseSkillMarkdown(markdown, basename(skillDir));
        records.push(
          upsertSkill(client, {
            id: skillDir.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
            name: parsed.name,
            description: parsed.description,
            category: parsed.category,
            rootPath: skillDir,
            skillMdPath,
            metadata: parsed.metadata
          })
        );
      } catch {
        // Ignore malformed or unreadable skill files; scanning should be resilient.
      }
    }
  }

  return records;
};
