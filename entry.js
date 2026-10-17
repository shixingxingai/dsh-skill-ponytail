import { existsSync, readFileSync, readdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** Cordis plugin name. */
const name = "ponytail";
/** Services required by the bundled provider and the always-on prompt section. */
const inject = ["skills", "systemPrompt"];
/** Registry provider label carried by every ponytail skill. */
const PROVIDER_NAME = "ponytail";
/**
 * Packaged-skill precedence. Kept as a literal rather than imported from
 * @deepseek-ai/dsh-skill: the host's copy lives in the app bundle, not in the
 * profile the plugin installs into, so importing it here would fail to resolve.
 * Mirrors BUNDLED_SKILL_RANK there (currently 600).
 */
const RANK = 600;

const ASSET_ROOT = fileURLToPath(new URL("./assets/", import.meta.url));

/** Strip one layer of YAML quoting from a single-line scalar. */
function unquote(raw) {
  const value = raw.trim();
  if (value.length > 1 && value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1).replaceAll("''", "'");
  if (value.length > 1 && value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1).replace(/\\(["\\])/gu, "$1");
  return value;
}

function parseSkill(raw, path) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(raw);
  if (frontmatter?.[1] === undefined) throw new Error(`ponytail: ${path} has no YAML frontmatter`);
  const fields = new Map();
  for (const line of frontmatter[1].split(/\r?\n/u)) {
    const field = /^([\w-]+):\s*(.*)$/u.exec(line);
    if (field === null) continue;
    if (/^[>|][+-]?\d*$/u.test(field[2].trim())) {
      throw new Error(`ponytail: ${path} writes "${field[1]}" as a YAML block scalar; this parser reads single-line values only`);
    }
    fields.set(field[1], unquote(field[2]));
  }
  const skillName = fields.get("name") ?? "";
  const description = fields.get("description") ?? "";
  if (skillName.length === 0 || description.length === 0) throw new Error(`ponytail: ${path} needs name and description`);
  return { name: skillName, description, content: raw.slice(frontmatter[0].length).trim() };
}

/**
 * Read every bundled skill directory. A directory without a SKILL.md, or one
 * whose SKILL.md cannot be parsed, is reported through `warn` and skipped
 * instead of failing the whole plugin.
 * @param warn - diagnostic sink for skipped or unreadable assets.
 * @returns the parsed skill candidates in directory order.
 */
function candidates(warn) {
  let entries;
  try {
    entries = readdirSync(ASSET_ROOT, { withFileTypes: true });
  } catch (error) {
    warn(`ponytail: cannot read asset directory ${ASSET_ROOT}: ${error.message}`);
    return [];
  }
  const skills = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const directory = join(ASSET_ROOT, entry.name);
    const locator = join(directory, "SKILL.md");
    if (!existsSync(locator)) {
      warn(`ponytail: ${directory} has no SKILL.md; skipped`);
      continue;
    }
    try {
      const { name: skillName, description } = parseSkill(readFileSync(locator, "utf8"), locator);
      skills.push({
        name: skillName,
        description,
        invocation: { modelInvocable: true, userInvocable: true },
        provider: PROVIDER_NAME,
        source: "bundled",
        rank: RANK,
        resourceBase: { kind: "directory", path: directory },
        path: locator,
        locator
      });
    } catch (error) {
      warn(`ponytail: ${locator} skipped: ${error.message}`);
    }
  }
  return skills;
}

/** Levels a session can run at; `off` drops the section from the prompt. */
const LEVELS = ["lite", "full", "ultra"];

/**
 * Render the injected section for one session. `off` returns an empty string,
 * which prompt assembly drops instead of rendering an empty section.
 * @param body - the bundled ponytail skill body.
 * @param level - the session's current level.
 */
function instructions(body, level) {
  if (level === "off") return "";
  return `PONYTAIL MODE ACTIVE (level: ${level}).

Scope: coding and repo work — writing, fixing, refactoring, reviewing, choosing dependencies. For anything else (email, research, prose), ignore these rules.

Honor the level the user asks for (/ponytail lite|full|ultra), and stop for the rest of this session when the user says "stop ponytail", "normal mode", or runs /ponytail-mode off.

${body}`;
}

/**
 * The level for a session: its own choice, else the causal parent's (so a
 * subagent inherits an off or a level from the session that spawned it).
 * @param agent - the agent the prompt is assembled for.
 * @param levels - per-session level map.
 */
function levelFor(agent, levels) {
  const session = agent?.session;
  return levels.get(session?.id) ?? levels.get(session?.header?.parentSession) ?? "full";
}

/**
 * Register `/ponytail-mode`, the deterministic switch behind the section. It
 * mutates the same map the section text reads, so switching needs no model
 * turn and cannot be forgotten after context compaction.
 * @param ctx - command-scoped context.
 * @param levels - per-session level map shared with the section.
 */
function registerMode(ctx, levels) {
  ctx.commands.register({
    name: "ponytail-mode",
    description: "Set the ponytail level for this session, or turn it off",
    input: { hint: "lite | full | ultra | off" },
    handler: ({ agent, rawInput }) => {
      const session = agent?.session?.id;
      if (session === undefined) return { kind: "error", text: "ponytail-mode: no session id" };
      const next = rawInput.trim().toLowerCase();
      if (next.length === 0) return { kind: "success", text: `Ponytail level: ${levels.get(session) ?? "full"}.` };
      if (next !== "off" && !LEVELS.includes(next)) {
        return { kind: "error", text: "Usage: /ponytail-mode lite | full | ultra | off" };
      }
      levels.set(session, next);
      return { kind: "success", text: next === "off" ? "Ponytail off for this session." : `Ponytail level: ${next}.` };
    }
  });
}

/**
 * Register the bundled ponytail skills and keep ponytail mode active in every
 * session while this plugin is enabled.
 * @param ctx - Context carrying the skill registry and the prompt registry.
 */
function apply(ctx) {
  const warn = (message) => ctx.logger?.warn(message);
  const catalog = candidates(warn);
  const provider = {
    name: PROVIDER_NAME,
    list: () => Promise.resolve(catalog),
    async get(candidate, options) {
      let raw;
      try {
        raw = await readFile(candidate.locator, { encoding: "utf8", signal: options.signal });
      } catch (error) {
        if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return undefined;
        throw error;
      }
      const parsed = parseSkill(raw, candidate.locator);
      return {
        name: candidate.name,
        description: parsed.description,
        invocation: candidate.invocation,
        provider: PROVIDER_NAME,
        source: "bundled",
        resourceBase: candidate.resourceBase,
        path: candidate.locator,
        content: parsed.content
      };
    }
  };
  ctx.skills.registerProvider(() => provider);
  const ponytail = catalog.find((skill) => skill.name === "ponytail");
  if (ponytail === undefined) {
    warn("ponytail: bundled skill \"ponytail\" is missing; no system-prompt section injected");
    return;
  }
  const body = parseSkill(readFileSync(ponytail.locator, "utf8"), ponytail.locator).content;
  const levels = new Map();
  // Injected rather than declared in the module-level `inject`: this cordis
  // has required dependencies only, and a host without a command surface
  // (headless, ACP) must still load the skills.
  ctx.inject(["commands"], (scope) => registerMode(scope, levels));
  ctx.effect(() => ctx.systemPrompt.section({
    name: "ponytail:instructions",
    order: (ctx.systemPrompt.getSectionOrder("DEPLOYMENT_PERSONA_PREFIX") ?? 0) + 100,
    text: ({ agent }) => instructions(body, levelFor(agent, levels)),
    interpolate: false
  }), "ponytail.section()");
}

export { apply, inject, name };
