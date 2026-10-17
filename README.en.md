# @shixingxingai/dsh-skill-ponytail · Ponytail for DeepSeek Harness

**English** | [中文](README.md)

DeepSeek Harness plugin port of [Ponytail](https://github.com/DietrichGebert/ponytail)
(the lazy senior dev mode: solve the problem with the smallest change, and explain it
in one read). One install puts all 6 skills into the `/` menu and the model's skill
catalog — and turns on ponytail mode in every session automatically.

## Install

```bash
git clone https://github.com/shixingxingai/dsh-skill-ponytail.git
```

Use `plugin_manager`'s `install_bundle` with the target pointing at the absolute
path of this directory. The install affects every session of the profile and survives
restarts. Remove it in Settings → Plugins.

`install_bundle` records a `link:` to this clone and the profile loads it in place —
no copy is made. So:

- **Do not move or delete the clone**: the next start cannot resolve the plugin and
  the skills disappear.
- Update with `git pull`, then restart DeepSeek Harness (`entry.js` is plugin code and
  needs a restart to load the new module).
- Install once per profile; a plugin installed only in `desktop` does not appear in `web`.

The package is `private` and is not published to npm; install it from the local
directory as described above.

## Usage

Type `/` in the composer and pick a skill, or type its name (`/ponytail-review`);
a word after the name goes with it (e.g. `/ponytail ultra`). The model can also load
any skill by name through the `skill` tool.

| Skill | Trigger | What it does |
|---|---|---|
| `ponytail` | `/ponytail` | The lazy senior mode itself: the smallest change, and a closing note on what was skipped and any risk. `/ponytail lite\|full\|ultra` switches level. |
| `ponytail-review` | `/ponytail-review` | Review one change: bugs, security, load, missing tests, slowness, cuttable code. |
| `ponytail-audit` | `/ponytail-audit` | The same quality review across the whole repo, ranked. |
| `ponytail-debt` | `/ponytail-debt` | Collect `shortcut:` comments into a debt ledger. |
| `ponytail-gain` | `/ponytail-gain` | Show the benchmarked savings. |
| `ponytail-help` | `/ponytail-help` | Quick reference card. |

## Auto-activation

With the plugin enabled, every session starts in ponytail mode (level **full**):
the `ponytail` skill body is injected as a system-prompt section, effective from the
first step, for the agent and every subagent. The section applies to **coding and repo
work only** (writing, fixing, refactoring, reviewing, choosing dependencies); research
questions, email and prose are left alone.

- Switch level: `/ponytail-mode lite\|full\|ultra` (direct, recommended); `/ponytail lite` still works
- Drop it for this conversation: `/ponytail-mode off`, or say "stop ponytail" / "normal mode"
- Stop auto-starting in all sessions: disable the plugin in Settings → Plugins

`/ponytail-mode` runs on the Harness command surface — no model message, no tokens — and the
handler updates plugin state: the section re-renders on the next step, and `off` removes it
from the system prompt entirely. It does not depend on the model remembering an instruction,
so it cannot come back after context compaction. State is per session and in memory;
subagents inherit the level of the session that spawned them, and a restart returns to
**full**. With no argument, `/ponytail-mode` reports the current level.

## Differences from upstream

- The 6 skill bodies come from upstream's `skills/` directory with the methodology
  unchanged; the frontmatter `description` was flattened to a single line because
  **this plugin reads single-line scalars only** — a folded `description: >` is rejected
  with an error and the skill is skipped (Harness itself parses multi-line YAML fine; the
  limit is the hand-written parser here). Upstream's `argument-hint` / `license` fields
  are dropped (invocation and licensing are handled by Harness and
  [LICENSE](LICENSE) respectively).
- `ponytail-review` / `ponytail-audit` report in **the user's language** instead of
  upstream's hard-coded "Very simple English"; the four-part finding structure and the
  examples are unchanged.
- The "switch level / leave the mode" line in the `ponytail` body was reworded for Harness.
- Added `/ponytail-mode lite\|full\|ultra\|off`: switching no longer relies on the model
  obeying the prompt — the command updates plugin state and the section re-renders on the
  next step (`off` removes it); upstream has no equivalent.
- The injected section now states its scope: coding and repo work only, so non-coding tasks
  are left alone.
- `ponytail-help`'s invocation and update sections were rewritten for Harness's
  `/` menu and Settings → Plugins, and the update note was corrected (a body change is
  picked up on the next load; a changed description or `entry.js` needs a restart).
- `ponytail-gain`'s bar note now says block characters — the sample chart already used
  `█`/`·` and the old note wrongly said ASCII.
- Added: skill-provider registration and automatic system-prompt injection — upstream
  relies on each host loading the skills on demand.

## Layout

```
package.json            bundle manifest; dsh.bundle.patch points at the patch
cordis.patch.yml        inserts one ponytail line
entry.js                host plugin: registers the skill provider + injects the
                        ponytail system-prompt section every session
assets/<name>/SKILL.md  the six skill bodies (name/description in YAML frontmatter)
locale/                 title and description shown on the plugin page
icon.svg                plugin-page icon
test/                   smoke tests (node --test, run by GitHub Actions)
```

The skill body is whatever `SKILL.md` says; `description` is read from the
single-line frontmatter. Editing a `SKILL.md` **body** is picked up by `/ponytail-*`
invocations immediately (the file is read when the skill loads), but the ponytail rules
injected on activation are a **snapshot taken at plugin load**: after editing
`ponytail/SKILL.md`, the system-prompt section still holds the old text until DeepSeek
Harness restarts (so the two disagree until then). Its **`description`** is likewise
read and cached when the plugin loads. Editing `entry.js` replaces installed package
code and also needs a restart to load the new module.

## Attribution

The skill bodies (`assets/*/SKILL.md`) are adapted from the `skills/` directory of
[DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail), published under
the **MIT License**, Copyright (c) DietrichGebert. The upstream copyright and license
notice is kept in full in [LICENSE](LICENSE), as MIT requires.

This repository only adapts the material for DeepSeek Harness (skill-provider
registration, system-prompt injection, locale); the methodology content is unchanged.
The Ponytail name and the original project belong to their author. This is an
independent third-party port with no affiliation, endorsement, or partnership.
