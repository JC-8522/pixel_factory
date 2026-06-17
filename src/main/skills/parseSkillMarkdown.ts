export type ParsedSkillMarkdown = {
  name: string;
  description: string | null;
  category: string | null;
  metadata: Record<string, unknown>;
};

const parseFrontmatter = (markdown: string): Record<string, string> => {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(markdown);

  if (!match) {
    return {};
  }

  return Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .map((line) => /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line.trim()))
      .filter((lineMatch): lineMatch is RegExpExecArray => Boolean(lineMatch))
      .map((lineMatch) => [lineMatch[1].toLowerCase(), lineMatch[2].replace(/^["']|["']$/g, "")])
  );
};

const firstHeading = (markdown: string): string | null => {
  const match = /^#\s+(.+)$/m.exec(markdown);
  return match?.[1].trim() ?? null;
};

const firstParagraph = (markdown: string): string | null => {
  const withoutFrontmatter = markdown
    .replace(/^---\r?\n[\s\S]*?\r?\n---/, "")
    .replace(/^#\s+.+$/m, "");
  const paragraph = withoutFrontmatter
    .split(/\r?\n\r?\n/)
    .map((block) => block.trim())
    .find((block) => block.length > 0 && !block.startsWith("#"));

  return paragraph ? paragraph.replace(/\s+/g, " ").slice(0, 240) : null;
};

export const parseSkillMarkdown = (markdown: string, fallbackName: string): ParsedSkillMarkdown => {
  const frontmatter = parseFrontmatter(markdown);
  const name = frontmatter.name || frontmatter.title || firstHeading(markdown) || fallbackName;
  const description = frontmatter.description || frontmatter.summary || firstParagraph(markdown);
  const category = frontmatter.category || frontmatter.type || null;

  return {
    name,
    description,
    category,
    metadata: {
      ...frontmatter,
      source: "skill_markdown"
    }
  };
};
