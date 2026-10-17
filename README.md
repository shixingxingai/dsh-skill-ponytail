# @shixingxingai/dsh-skill-ponytail · Ponytail for DeepSeek Harness

**中文** | [English](README.en.md)

[Ponytail](https://github.com/DietrichGebert/ponytail)（懒人资深开发模式：最小改动解决问题，回复一段话就能看懂）
的 DeepSeek Harness 插件版。一次安装，6 个技能进入 `/` 菜单与模型的 skill 目录，
并且每个会话自动开启 ponytail 模式。

## 安装

```bash
git clone git@github.com:shixingxingai/dsh-skill-ponytail.git
```

用 `plugin_manager` 的 `install_bundle`，target 指向本目录的绝对路径。
安装影响该 profile 的所有会话，重启后依然有效；卸载在 设置 → Plugins 里删除。

## 使用

在输入框敲 `/` 从菜单选，或直接敲技能名（如 `/ponytail-review`）；
名字后面带词会一并送出（如 `/ponytail ultra`）。模型也可以通过 `skill` 工具按名加载。

| 技能 | 触发 | 作用 |
|---|---|---|
| `ponytail` | `/ponytail` | 懒人资深模式本体：最小改动、一行回复说清跳过了什么、有什么风险。`/ponytail lite\|full\|ultra` 切换档位。 |
| `ponytail-review` | `/ponytail-review` | 审一次改动：bug、安全、负载、缺测试、慢、能删的代码。 |
| `ponytail-audit` | `/ponytail-audit` | 同样的质量审查，作用于整个仓库，按重要性排序。 |
| `ponytail-debt` | `/ponytail-debt` | 收集 `shortcut:` 注释，输出欠账清单。 |
| `ponytail-gain` | `/ponytail-gain` | 展示基准测试测得的收益。 |
| `ponytail-help` | `/ponytail-help` | 速查卡。 |

## 自动启用

插件开启时，每个会话自动进入 ponytail 模式（档位 **full**）：
`ponytail` 技能正文作为系统提示词段注入，从第一步起生效，子代理同样生效。

- 换档：`/ponytail lite\|full\|ultra`
- 本会话退出：说 "stop ponytail" / "normal mode"，或 `/ponytail off`
- 所有会话不再自动启用：设置 → Plugins 里停用本插件

## 与上游的差异

- 6 个技能正文与上游 `skills/` 目录一致；frontmatter 的 `description` 改为单行（Harness 解析要求）。
- `ponytail-help` 的调用与更新说明改写为 Harness 的 `/` 菜单与 设置 → Plugins。
- 新增 skill provider 注册与系统提示词自动注入：上游靠各宿主自行加载、只在被调用时生效。

## 结构

```
package.json            bundle 清单，dsh.bundle.patch 指向补丁
cordis.patch.yml        插入一行 ponytail
main.js                 Host 插件：注册 skill provider + 每会话注入 ponytail 系统提示词段
assets/<name>/SKILL.md  六个技能正文（name/description 在 YAML frontmatter）
locale/                 插件页显示的标题与描述
```

技能正文以 `SKILL.md` 为准，`description` 从 frontmatter 单行读出。
改 `SKILL.md` 立即生效（技能加载时才读盘）；改 `main.js` 属于替换已安装包的代码，
需要重启 DeepSeek Harness 才会加载新一代模块。

## 声明 / Attribution

本项目的技能正文（`assets/*/SKILL.md`）改写自
[DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)
的 `skills/` 目录，原项目以 **MIT 许可**发布，版权归 DietrichGebert 所有。
原项目的版权与许可声明完整保留在本仓库 [LICENSE](LICENSE) 中（MIT 要求随副本保留）。

本仓库仅做 DeepSeek Harness 适配（skill provider 注册、系统提示词注入、locale），
未改动其方法论内容；Ponytail 名称与原项目成果归原作者所有。
本项目为独立的第三方移植，与原作者无隶属、背书或合作关系。
