# @shixingxingai/dsh-skill-ponytail · Ponytail for DeepSeek Harness

**中文** | [English](README.en.md)

[Ponytail](https://github.com/DietrichGebert/ponytail)（懒人资深开发模式：最小改动解决问题，回复一段话就能看懂）
的 DeepSeek Harness 插件版。一次安装，6 个技能进入 `/` 菜单与模型的 skill 目录，
并且每个会话自动开启 ponytail 模式。

## 安装

```bash
git clone https://github.com/shixingxingai/dsh-skill-ponytail.git
```

用 `plugin_manager` 的 `install_bundle`，target 指向本目录的绝对路径。
安装影响该 profile 的所有会话，重启后依然有效；卸载在 设置 → Plugins 里删除。

`install_bundle` 记下的是 `link:` 指向，profile 直接用这个克隆目录，不复制文件。所以：

- **不要移动或删除克隆目录**：下次启动解析不到插件，技能会消失。
- 更新用 `git pull`，然后重启 DeepSeek Harness（`entry.js` 是插件代码，要重启才加载新模块）。
- 每个 profile 各装一次；只装在 `desktop` 的插件，在 `web` profile 里不会出现。

包本身是 `private`，不发布到 npm；安装只走上面的本地目录方式。

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
注入段只对**编码与仓库类任务**生效（写代码、修 bug、重构、评审、选依赖）；
做调研、写信、答问不套用这些规则。

- 换档：`/ponytail-mode lite\|full\|ultra`（推荐，直接改状态）；`/ponytail lite` 也仍可用
- 本会话退出：`/ponytail-mode off`，或说 "stop ponytail" / "normal mode"
- 所有会话不再自动启用：设置 → Plugins 里停用本插件

`/ponytail-mode` 走 Harness 的命令面（不生成模型消息、不消耗 token），handler 直接改插件状态：
注入段在下一步就按新档位重渲染，**关掉时整段从系统提示词移除**。因此它不依赖模型记住指令，
上下文压缩或多轮之后也不会"复活"。状态按会话保存在内存里，子代理继承父会话的档位，
重启应用后回到 **full**。不传参数（`/ponytail-mode`）会显示当前档位。

## 与上游的差异

- 6 个技能正文取自上游 `skills/` 目录，方法论未改；frontmatter 的 `description` 改为单行——**本插件只解析单行标量**，
  遇到上游那种 `description: >` 折叠写法会直接报错并跳过该技能（Harness 自身能正常解析多行，
  限制来自这里的手写解析器）；上游的 `argument-hint`、`license` 两个字段不再保留
  （技能调用与许可分别由 Harness 与 [LICENSE](LICENSE) 负责）。
- `ponytail-review` / `ponytail-audit` 的输出语言改为**跟随用户语言**（上游写死 “Very simple English”），
  报告的四段式结构与示例未变。
- `ponytail` 正文里「换档/退出」那一行按 Harness 的表述重写。
- 新增 `/ponytail-mode lite\|full\|ultra\|off` 命令：换档与退出不再只靠提示词自律，
  而是直接改插件状态，注入段随之下一步重渲染（off 时整段移除）；上游没有对应机制。
- 注入段增加的 scope 限定：只对编码与仓库类任务生效，非编码任务不套用。
- `ponytail-help` 的调用与更新说明改写为 Harness 的 `/` 菜单与 设置 → Plugins，
  并订正更新生效条件（正文下次加载生效，description 与 `entry.js` 需重启）。
- `ponytail-gain` 的条形图说明改为方块字符（示例本就用 `█`/`·`，原说明误写为 ASCII）。
- 新增 skill provider 注册与系统提示词自动注入：上游靠各宿主自行加载、只在被调用时生效。

## 结构

```
package.json            bundle 清单，dsh.bundle.patch 指向补丁
cordis.patch.yml        插入一行 ponytail
entry.js                Host 插件：注册 skill provider + 每会话注入 ponytail 系统提示词段
assets/<name>/SKILL.md  六个技能正文（name/description 在 YAML frontmatter）
locale/                 插件页显示的标题与描述
icon.svg                插件页图标
test/                   冒烟测试（node --test，GitHub Actions 自动跑）
```

技能正文以 `SKILL.md` 为准，`description` 从 frontmatter 单行读出。
改 `SKILL.md` 的**正文**，对 `/ponytail-*` 的调用立即生效（技能加载时才读盘）；但插件开启时注入的
ponytail 规则是**加载时的快照**，改完 `ponytail/SKILL.md` 正文后，那段系统提示词要重启
DeepSeek Harness 才更新（重启前技能正文与注入段会不一致）。**`description` 同样在插件加载时
读出并缓存，改后需重启**。改 `entry.js` 属于替换已安装包的代码，也需要重启才会加载新一代模块。

## 声明 / Attribution

本项目的技能正文（`assets/*/SKILL.md`）改写自
[DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)
的 `skills/` 目录，原项目以 **MIT 许可**发布，版权归 DietrichGebert 所有。
原项目的版权与许可声明完整保留在本仓库 [LICENSE](LICENSE) 中（MIT 要求随副本保留）。

本仓库仅做 DeepSeek Harness 适配（skill provider 注册、系统提示词注入、locale），
未改动其方法论内容；Ponytail 名称与原项目成果归原作者所有。
本项目为独立的第三方移植，与原作者无隶属、背书或合作关系。
