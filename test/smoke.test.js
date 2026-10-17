import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { test } from "node:test";

const ENTRY = fileURLToPath(new URL("../entry.js", import.meta.url));
const EXPECTED_SKILLS = [
  "ponytail",
  "ponytail-audit",
  "ponytail-debt",
  "ponytail-gain",
  "ponytail-help",
  "ponytail-review"
];

/** Minimal stand-in for the Cordis context the plugin needs. */
function stubContext() {
  const providers = [];
  const sections = [];
  const warnings = [];
  const commands = [];
  const ctx = {
    logger: { warn: (message) => warnings.push(message) },
    skills: {
      registerProvider: (create) => {
        providers.push(create({ invalidate() {}, signal: new AbortController().signal }));
      }
    },
    systemPrompt: {
      getSectionOrder: (name) => (name === "DEPLOYMENT_PERSONA_PREFIX" ? 0 : undefined),
      section: (section) => {
        sections.push(section);
        return () => {};
      }
    },
    effect: (execute) => execute(),
    inject: (services, callback) => {
      assert.deepEqual(services, ["commands"]);
      callback({ ...ctx, commands: { register: (definition) => commands.push(definition) } });
    }
  };
  return { ctx, providers, sections, warnings, commands };
}

async function boot(entry) {
  const module = await import(pathToFileURL(entry).href);
  const harness = stubContext();
  module.apply(harness.ctx);
  return { module, ...harness, provider: harness.providers[0] };
}

/** Build a throwaway copy of the plugin so a broken SKILL.md can be fed to it. */
async function fixture(t, writeAsset) {
  const directory = await mkdtemp(join(tmpdir(), "ponytail-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  await writeFile(join(directory, "package.json"), JSON.stringify({ type: "module" }));
  await copyFile(ENTRY, join(directory, "entry.js"));
  await writeAsset(join(directory, "assets"));
  return join(directory, "entry.js");
}

const signal = () => new AbortController().signal;

test("registers the provider, the mode command and the always-on prompt section", async () => {
  const { module, providers, sections, warnings, commands } = await boot(ENTRY);

  assert.deepEqual(module.inject, ["skills", "systemPrompt"]);
  assert.equal(module.name, "ponytail");
  assert.equal(providers.length, 1);
  assert.equal(providers[0].name, "ponytail");
  assert.equal(commands.length, 1);
  assert.equal(commands[0].name, "ponytail-mode");
  assert.equal(sections.length, 1);
  assert.equal(sections[0].name, "ponytail:instructions");
  assert.equal(sections[0].order, 100);
  assert.equal(sections[0].interpolate, false);

  const text = sections[0].text({ agent: { session: { id: "s1" } } });
  assert.match(text, /^PONYTAIL MODE ACTIVE \(level: full\)/u);
  assert.match(text, /Scope: coding and repo work/u);
  assert.match(text, /You are a lazy senior developer\./u);
  assert.deepEqual(warnings, []);
});

test("the mode command switches one session without a model turn", async () => {
  const { sections, commands } = await boot(ENTRY);
  const [command] = commands;
  const render = (id) => sections[0].text({ agent: { session: { id } } });
  const run = (rawInput, id = "s1") => command.handler({ agent: { session: { id } }, rawInput });

  assert.equal(run("off").kind, "success");
  assert.equal(render("s1"), "", "off empties the section");
  assert.match(render("s2"), /\(level: full\)/u, "another session keeps the default");

  assert.equal(run("ULTRA").kind, "success");
  assert.match(render("s1"), /\(level: ultra\)/u, "level is case-insensitive");
  assert.match(run("").text, /ultra/u, "no argument reports the current level");

  const rejected = run("bogus");
  assert.equal(rejected.kind, "error");
  assert.match(rejected.text, /Usage/u);
  assert.match(render("s1"), /\(level: ultra\)/u, "an invalid level changes nothing");

  const child = { agent: { session: { id: "child", header: { parentSession: "s1" } } } };
  assert.match(sections[0].text(child), /\(level: ultra\)/u, "a subagent inherits the parent's level");
  run("off");
  assert.equal(sections[0].text(child), "", "a subagent inherits off too");
});

test("lists every bundled skill with a usable catalog entry", async () => {
  const { provider } = await boot(ENTRY);
  const skills = await provider.list({ cwd: process.cwd() });

  assert.deepEqual(skills.map((skill) => skill.name).sort(), [...EXPECTED_SKILLS].sort());
  for (const skill of skills) {
    assert.match(skill.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/u);
    assert.ok(skill.description.length > 20, `${skill.name}: description is "${skill.description}"`);
    assert.equal(skill.rank, 600);
    assert.equal(skill.source, "bundled");
    assert.equal(skill.provider, "ponytail");
    assert.deepEqual(skill.invocation, { modelInvocable: true, userInvocable: true });
  }
});

test("loads each body without its frontmatter", async () => {
  const { provider } = await boot(ENTRY);
  for (const candidate of await provider.list({ cwd: process.cwd() })) {
    const skill = await provider.get(candidate, { signal: signal() });
    assert.equal(skill.name, candidate.name);
    assert.equal(skill.description, candidate.description);
    assert.ok(skill.content.length > 0, `${skill.name}: empty body`);
    assert.ok(!skill.content.startsWith("---"), `${skill.name}: body still carries frontmatter`);
  }
});

test("returns undefined when the skill file disappeared", async () => {
  const { provider } = await boot(ENTRY);
  const [candidate] = await provider.list({ cwd: process.cwd() });
  const gone = { ...candidate, locator: join(tmpdir(), "ponytail-missing", "SKILL.md") };

  assert.equal(await provider.get(gone, { signal: signal() }), undefined);
});

test("rejects a folded description instead of registering it", async (t) => {
  const entry = await fixture(t, async (assets) => {
    const folded = join(assets, "folded");
    await mkdir(folded, { recursive: true });
    await writeFile(join(folded, "SKILL.md"), "---\nname: folded\ndescription: >\n  Two lines\n  of prose.\n---\n\n# Folded\n");
    const good = join(assets, "good");
    await mkdir(good, { recursive: true });
    await writeFile(join(good, "SKILL.md"), '---\nname: good\ndescription: "A \\"quoted\\" single line."\n---\n\n# Good\n');
  });

  const { provider, sections, warnings } = await boot(entry);
  const skills = await provider.list({ cwd: process.cwd() });

  assert.deepEqual(skills.map((skill) => skill.name), ["good"]);
  assert.equal(skills[0].description, 'A "quoted" single line.');
  assert.ok(warnings.some((warning) => /block scalar/u.test(warning)), warnings.join("\n"));
  assert.equal(sections.length, 0);
});
