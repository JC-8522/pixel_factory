/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { parseSkillMarkdown } from "./parseSkillMarkdown";

describe("parseSkillMarkdown", () => {
  it("parses frontmatter and falls back to headings or folder names", () => {
    expect(
      parseSkillMarkdown(
        `---\nname: Reviewer\ncategory: quality\ndescription: Reviews changes\n---\n# Ignored\nBody`,
        "fallback"
      )
    ).toMatchObject({
      name: "Reviewer",
      category: "quality",
      description: "Reviews changes"
    });

    expect(parseSkillMarkdown("# Builder\nBuilds features.", "fallback")).toMatchObject({
      name: "Builder",
      description: "Builds features."
    });
  });
});
