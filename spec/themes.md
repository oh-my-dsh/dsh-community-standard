# Spec: 主题契约（Theme Contract）

> **状态：Draft（社区讨论稿，非官方标准）｜ 依据 [RFC 0005](../rfcs/0005-declarative-views.md)，目标版本 v0.16**
> 每条"必须"对应的测试样本，统一列在文末 [§5 错误表](#5-错误与边界情况) 和 [§6 fixtures 清单](#6-对应-fixtures-清单)，正文不再逐条标注。

## 0. 这份文档管什么

一句话：**把皮肤/主题从潜规则变成明规则。** 本文规定 `contributes.themes` 的声明格式、`--dsw-*` 设计令牌契约、稳定 DOM 钩子注册表，以及主题的互斥与卸载纪律。

为什么要专门一份契约：今天皮肤插件的整个实现建立在**零承诺的钩子**上。以 galgame 皮肤插件为典型（证据见 [research/ui-layer-plan.md](../research/ui-layer-plan.md)）——它靠覆盖 `--dsw-*` CSS 变量和选择 `data-pane` 这类 DOM 属性工作，而宿主对这两样东西既没有注册表，也没有弃用政策，官方哪天改个类名，皮肤就无声地碎掉，社区消费方只能按"钩子随时会漂移"写自愈代码。本文的规定就一件事：哪些是承诺，承诺了就不能随便改。

以下内容不在本文：

- 视图位置与 `contributes.views` → [views.md](views.md)
- manifest 顶层结构 → [manifest.md](manifest.md)
- 激活与卸载的通用纪律 → [lifecycle.md](lifecycle.md)

## 1. `contributes.themes` 声明

使用本契约的插件**必须**在 `requires.contracts` 中声明契约坐标 `themes.dsh/v1alpha1`（kind: `Theme`），然后在 `contributes.themes` 数组里逐条声明主题。不声明契约坐标就贡献主题，宿主必须按 required 契约缺失处理（见 [negotiation.md](negotiation.md)）。

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `id` | string | **是** | 主题全局唯一 ID，反向域名语法，应该以插件自身 `id` 为前缀 |
| `title` | string | **是** | 人读名称，直接出现在宿主的主题选择界面里 |
| `tokens` | object | **是** | map：令牌名 → 值。令牌名**必须**存在于 registry 的 `--dsw-*` 令牌表（§2），自造令牌名校验失败 |
| `dark` | object | 否 | map：暗色模式下的覆盖值，键同样必须是表中令牌 |

示例（坐标与令牌名为示意，以 Registry 定案为准）：

```json
{
  "requires": {
    "contracts": [
      { "apiVersion": "themes.dsh/v1alpha1", "kind": "Theme" }
    ]
  },
  "contributes": {
    "themes": [
      {
        "id": "com.example.galgame-skin.sakura",
        "title": "Sakura",
        "tokens": {
          "--dsw-alias-accent": "#e88ca0",
          "--dsw-alias-surface": "#fff5f7"
        },
        "dark": {
          "--dsw-alias-surface": "#2a2126"
        }
      }
    ]
  }
}
```

一个插件**可以**贡献多个主题（一套皮肤的若干配色变体是常态）；每个主题是独立的选择单位。

## 2. 设计令牌契约

`--dsw-*` 是宿主的 CSS 自定义属性（设计令牌），分两层：

- **静态调色板 `--dsw-static-*`**：具体色值，如 `--dsw-static-rose-400`。这层是原料，主题**可以**引用，但终端 UI 一般不应直接消费——直接消费静态色，暗色模式就要逐点返工。
- **语义别名 `--dsw-alias-*`**：用途命名，如 `--dsw-alias-accent`、`--dsw-alias-surface`。组件消费别名，主题覆盖别名，一次换肤全界面生效。

规则：

- 令牌表（两层全量清单、含义、允许的值类型）**进 registry 维护**，随 `themes.dsh/v1alpha1` 条目版本演进，**带弃用政策**——弃用一个令牌必须先标记、给迁移窗口，不得无声删除。没有弃用政策，"注册表"就只是现状快照，不构成承诺。
- 主题的 `tokens` / `dark` **只准覆盖表中令牌**；出现表外令牌名，校验必须失败。为什么：允许自造令牌名，等于默许主题去赌宿主的内部变量，注册表形同虚设——而拼错的令牌名也会在静默中失效，作者以为生效了，实际没有。
- 宿主**必须**把主题令牌应用在别名层（覆盖 `--dsw-alias-*` 的取值），不得要求主题逐组件覆盖。

## 3. 稳定 DOM 钩子

令牌覆盖不到的需求（布局微调、挂件容器）走 DOM 钩子：宿主在稳定元素上挂 `data-pane`、`data-composer-seat` 这类属性，主题和宿主约定"这些属性名是契约"。规则：

- 登记过的 DOM 钩子**建注册表**（随 `themes.dsh/v1alpha1` 条目维护），**带弃用政策**，与令牌表同一套纪律。
- 主题与插件**不得**依赖注册表以外的 DOM 结构（类名、层级、未登记的 `data-*` 属性）。违反视为使用私有 API，宿主不保证兼容——这正是今天 galgame 皮肤的处境，本文把它从"没办法"变成"有明确的界内界外"。
- **补槽优先、注册表兜底**：能被 location 消灭的需求不承诺钩子。每次评审新钩子申请时先问一句"这是不是其实是个视图位置"——能被 `shell.overlay`、`composer.dock` 这类 location 直接承接的，走 [views.md](views.md) 的声明式贡献，不进钩子注册表。只有消灭不掉的（如 composer 区域的纯样式诉求），才登记为钩子。为什么：每承诺一个 DOM 钩子，宿主就背上一份重构时不能动的结构债，能不欠就不欠。

## 4. 互斥与卸载

- **互斥**：宿主同时**只激活一个皮肤主题**，并且**必须**提供主题选择界面让用户切换。两个主题同时生效，同一名称的令牌互相覆盖，结果由注入顺序决定——又是"谁后加载谁赢"的玄学，必须排除。非皮肤类的样式贡献（视图组件自带的 CSS Modules）不受此限，它们各管各的视图（见 [views.md §5](views.md)）。
- **可逆**：激活、切换、卸载主题必须完全可逆，不留残留。实现上，主题样式**必须**带插件标记注入（如 `<style data-plugin="插件 id">` 或宿主等价的归属机制），卸载或切换时按标记整体清除。没有归属标记，"清除"只能靠猜，残留样式会把下一个主题染花。
- 主题随插件 activation 生效、随 deactivate 卸载，纪律与视图一致（见 [lifecycle.md](lifecycle.md)）；切换主题不需要重启会话，宿主**应该**即时应用。

## 5. 错误与边界情况

| 情况 | 规定行为 | 抓住它的 fixture / 测试 |
| --- | --- | --- |
| `tokens` / `dark` 覆盖未登记令牌 | 校验失败，拒绝加载 | `invalid/theme-unknown-token.json` |
| 未声明 `themes.dsh/v1alpha1` 契约就贡献主题 | 按 required 契约缺失拒载 | negotiation suites |
| 跨插件主题 `id` 冲突 | 安装前静态检出，报"冲突，不能共存" | suites 冲突场景 |
| 用户激活第二个皮肤主题 | 宿主必须先停用当前主题再切换，不得并存 | suites 互斥断言 |
| 卸载/切换后样式残留 | 不合规：带标记注入的样式必须按标记清除 | suites 清理断言 |
| 依赖未登记的 DOM 结构 | 视为使用私有 API，宿主不保证兼容，可以拒载 | suites 静态检查 |
| `dark` 中出现 `tokens` 没有的表内令牌 | 合法（暗色模式按需覆盖子集） | `valid/views-theme.json` |

## 6. 对应 fixtures 清单

fixtures 由后续任务创建，路径约定如下（与 [views.md §9](views.md) 共用 `conformance/fixtures/manifest/` 目录）：

| 路径 | 测法 |
| --- | --- |
| `conformance/fixtures/manifest/valid/views-theme.json` | 合法样本（与 views.md 共用）：`contributes.themes` 声明一个带 `tokens` 与 `dark` 的主题，令牌名全部取自 registry 令牌表，校验必须通过 |
| `conformance/fixtures/manifest/invalid/theme-unknown-token.json` | `tokens` 含未登记令牌名，校验必须失败 |

`theme-unknown-token.json` 的合法性依赖 registry 快照而非纯 JSON Schema——校验器必须把登记过的令牌表作为校验输入（约定见 [conformance/fixtures/README.md](../conformance/fixtures/README.md)）。

## 变更记录

| 版本 | 变更 |
| --- | --- |
| v0.16（目标） | 首版成稿。依据 [RFC 0005](../rfcs/0005-declarative-views.md) 与 [research/ui-layer-plan.md](../research/ui-layer-plan.md)：`contributes.themes` 声明格式、`--dsw-static-*` / `--dsw-alias-*` 两层令牌契约、DOM 钩子注册表（补槽优先、注册表兜底）、主题互斥与可逆卸载。 |

## 关联

- [RFC 0005：声明式视图贡献点](../rfcs/0005-declarative-views.md)——本文的设计依据
- [research/ui-layer-plan.md](../research/ui-layer-plan.md)——调研证据（galgame 皮肤等）
- [spec/views.md](views.md)——视图贡献点（location、组件交付、样式纪律）
- [spec/manifest.md](manifest.md)——manifest 顶层结构
- [spec/lifecycle.md](lifecycle.md)——activation 生命周期纪律
- [spec/negotiation.md](negotiation.md)——契约协商与拒载判定
- [registry/](../registry/README.md)——令牌表与 DOM 钩子注册表的权威来源
