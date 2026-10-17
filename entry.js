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
  if (value.length > 1 && value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
  return value;
}

function parseSkill(raw, path) {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(raw);
  if (frontmatter?.[1] === undefined) throw new Error(`ponytail: ${path} has no YAML frontmatter`);
  const fields = new Map();
  for (const line of frontmatter[1].split(/\r?\n/u)) {
    const field = /^([\w-]+):\s*(.*)$/u.exec(line);
    if (field !== null) fields.set(field[1], unquote(field[2]));
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
      const raw = await readFile(candidate.locator, { encoding: "utf8", signal: options.signal });
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
  ctx.effect(() => ctx.systemPrompt.section({
    name: "ponytail:instructions",
    order: (ctx.systemPrompt.getSectionOrder("DEPLOYMENT_PERSONA_PREFIX") ?? 0) + 100,
    text: `PONYTAIL MODE ACTIVE (default level: full). Honor any level the user asks for (/ponytail lite|full|ultra), and stop applying these rules for the rest of this session when the user says "stop ponytail" or "normal mode".\n\n${body}`,
    interpolate: false
  }), "ponytail.section()");
}

export { apply, inject, name };
