# @shixingxingai/dsh-skill-ponytail · Ponytail for DeepSeek Harness

**English** | [中文](README.md)

DeepSeek Harness plugin port of [Ponytail](https://github.com/DietrichGebert/ponytail)
(the lazy senior dev mode: solve the problem with the smallest change, and explain it
in one read). One install puts all 6 skills into the `/` menu and the model's skill
catalog — and turns on ponytail mode in every session automatically.

## Install

```bash
git clone git@github.com:shixingxingai/dsh-skill-ponytail.git
```

Use `plugin_manager`'s `install_bundle` with the target pointing at the absolute
path of this directory. The install affects every session of the profile and survives
restarts. Remove it in Settings → Plugins.

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
first step, for the agent and every subagent.

- Switch level: `/ponytail lite\|full\|ultra`
- Drop it for this conversation: say "stop ponytail" / "normal mode", or `/ponytail off`
- Stop auto-starting in all sessions: disable the plugin in Settings → Plugins

## Differences from upstream

- The 6 skill bodies match upstream's `skills/` directory; only the frontmatter
  `description` was flattened to a single line (Harness parses single-line scalars).
- `ponytail-help`'s invocation and update sections were rewritten for Harness's
  `/` menu and Settings → Plugins.
- Added: skill-provider registration and automatic system-prompt injection — upstream
  relies on each host loading the skills on demand.

## Layout

```
package.json            bundle manifest; dsh.bundle.patch points at the patch
cordis.patch.yml        inserts one ponytail line
main.js                 host plugin: registers the skill provider + injects the
                        ponytail system-prompt section every session
assets/<name>/SKILL.md  the six skill bodies (name/description in YAML frontmatter)
locale/                 title and description shown on the plugin page
```

The skill body is whatever `SKILL.md` says; `description` is read from the
single-line frontmatter. Editing `SKILL.md` takes effect immediately (it is read
from disk at load time). Editing `main.js` replaces installed package code and needs
a DeepSeek Harness restart to load the new module.

## Attribution

The skill bodies (`assets/*/SKILL.md`) are adapted from the `skills/` directory of
[DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail), published under
the **MIT License**, Copyright (c) DietrichGebert. The upstream copyright and license
notice is kept in full in [LICENSE](LICENSE), as MIT requires.

This repository only adapts the material for DeepSeek Harness (skill-provider
registration, system-prompt injection, locale); the methodology content is unchanged.
The Ponytail name and the original project belong to their author. This is an
independent third-party port with no affiliation, endorsement, or partnership.
