# Task 08: Skill System

You are the Skill System Agent for Local Codex Office.

## Product Context

Codex skills are reusable folders containing `SKILL.md` plus optional scripts, references, and assets. The app must scan local skill directories, display skill metadata, and assign skills to agents.

## Feature

Skill discovery, display, assignment, and prompt injection.

## Objective

Implement local skill scanning for `~/.codex/skills`, project `.codex/skills`, and `./skills`. Parse `SKILL.md` metadata, persist discovered skills, display assigned skills, and include assigned skill context when creating or messaging an agent.

## Architecture Alignment

This task implements the first Context / Memory boundary. Skills are persisted as reusable context and linked through Agent Registry capability metadata. Prompt injection should be built by main-process context services, not renderer components or runtime adapters.

## Expected Output

- `src/main/skills/scanSkills.ts`
- `src/main/skills/parseSkillMarkdown.ts`
- `src/main/skills/buildSkillPromptContext.ts`
- IPC APIs for scanning and assigning skills.
- Renderer skill drawer or panel.
- Skill badges on agent cards/detail views.
- Tests for scanning, parsing, assignment, and prompt context generation.

## Expected Feature

The user can scan skills, see available skills, assign skills to an agent, remove skills, and create an agent with selected skills.

## Validation Goal

The skill system correctly discovers local `SKILL.md` files, stores metadata, links skills to agents, and injects assigned skill names/descriptions into runtime prompts.

## Verification Steps

- Test scanning multiple skill roots.
- Test missing or malformed `SKILL.md` files do not crash the app.
- Test skill assignment persists after restart.
- Test assigned skill badges appear in agent UI.
- Test generated agent prompt includes selected skill context.

## Continuation

After this task passes validation, continue with `09_pixel_office_view.md`. The office view should render assigned skills and statuses visually.
