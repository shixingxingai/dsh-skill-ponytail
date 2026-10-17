---
name: ponytail-help
description: 'Quick reference for ponytail levels, skills and commands. One-shot display. Use for /ponytail-help, "ponytail help", "how do I use ponytail".'
---

# Ponytail Help

Display this reference card when invoked. One-shot, do NOT change mode,
write flag files, or persist anything.

## Levels

| Level | Trigger | What change |
|-------|---------|-------------|
| **Lite** | `/ponytail lite` | Build what was asked, name the smaller option in one line. |
| **Full** | `/ponytail` | The smallest complete change, a check where the logic needs one, and a reply that names what was skipped and any risk. Default. |
| **Ultra** | `/ponytail ultra` | Also questions the request and pushes back before building. |

Level sticks until changed or session end.

With the DeepSeek Harness plugin enabled, every session starts in ponytail mode
at level **full** on its own: the rules sit in the system prompt from the first
step on, for this agent and every subagent. `/ponytail` with a level word
switches the level for the conversation.

## Skills

| Skill | Trigger | What it does |
|-------|---------|--------------|
| **ponytail** | `/ponytail` | Lazy mode itself: least new code, clear replies that name skipped work and risks. |
| **ponytail-review** | `/ponytail-review` | Quality review of a diff: bugs, security, load, missing tests, speed, what to cut. Each finding says what goes wrong and how to fix it. |
| **ponytail-audit** | `/ponytail-audit` | The same quality review for the whole repo, ranked. |
| **ponytail-debt** | `/ponytail-debt` | Harvest `shortcut:` comments into a tracked ledger. |
| **ponytail-gain** | `/ponytail-gain` | Measured-impact scoreboard: less code, less cost, more speed. |
| **ponytail-help** | `/ponytail-help` | This card. |

In DeepSeek Harness every skill is a slash entry: type `/` in the composer and
pick one from the menu, or type its name, e.g. `/ponytail-review`. A word after
the name goes with it, so `/ponytail ultra` sets the level. The same skills sit
in the model's skill catalog, so asking for one by name works as well.

## Deactivate

Say "stop ponytail" or "normal mode" to drop it for this conversation. Resume
anytime with `/ponytail`. `/ponytail off` also works. To stop ponytail from
auto-starting in every session, disable the Ponytail plugin in
DeepSeek Harness settings → Plugins.

## Update

DeepSeek Harness settings → Plugins manages this bundle: install, remove or
reinstall it there, then start a new session to pick up changed skills.

## More

Full docs + examples: https://github.com/DietrichGebert/ponytail
