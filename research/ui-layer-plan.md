# UI 层设计规划：声明式视图贡献点

> **状态：调研与规划稿（非规范，供 RFC 0005 起草与社区表决使用）**
> 本文基于 2026-08-20 的一轮实证调研：四个热门社区插件源码、dsh 官方新本体（deepseek-harness）、社区宿主 dsh-web-ui、社区参考实现 dsh-neoforge，以及 community#23 / #24 的讨论。
> 结论先行：**不另起炉灶。把 dsh 已有的事实标准（slot 系统 + 种子模块 bundle + 设计令牌）升格为 manifest 声明式契约，分四期做。**

## 1. 证据：现状是什么样

### 1.1 官方本体已有一整套 slot 系统（这是最重要的发现）

deepseek-harness 的 Web GUI 是三栏 shell，**一切皆 slot**（`packages/client/ui-slots`）：

- 渲染树根是 `'root'` slot，AppFrame 占据后声明四个一级区域：`sidebar` / `conversation` / `details` / `shell.overlay`
- slot 有四种 kind（基数语义）：`single | list | keyed | chain`；三种 scope：`root | session-maybe | session`
- 注册 API 是命令式代码：`ctx.slots.register({ name, id, order, label, inject, locale }, Component)`
- slot 目录靠 **TypeScript 声明合并**扩展 `interface SlotMap {}`——编译期机制，**运行时不自描述**

真实的 slot 清单（`ui-conversation/contract/slots.ts` 等）已经覆盖：对话区 tab（`conversation.view`）、消息节点渲染器（`conversation.chat.node`，keyed）、命令渲染器（`conversation.chat.commandview`，keyed）、工具详情（`conversation.details.tool`）、输入区小件（`conversation.input.left/right/dock`）、设置页（`settings.section`、`settings.general.item` 等一族）。

### 1.2 热门插件真实在碰的 UI 表面

| 插件 | UI 表面 | 手段 |
| --- | --- | --- |
| dsh-activity-plugin | 对话区 tab（活动仪表盘） | `conversation.view` slot + React 组件 |
| dsh-tavern-plugin | 对话区 tab（小酒馆） | `conversation.view` slot + node 半区 HTTP 路由 |
| dsh-travel-plugin | 对话区 tab + **右侧面板** | 双 slot + **手工 patch 宿主包**补出 `details.panel` |
| dsh-galgame-like-skin | 全局皮肤（气泡/composer/背景/favicon/挂件） | 纯 DOM/CSS 注入，依赖 `--dsw-*` 令牌和 `data-*` 钩子 |

另有 dsh-web-ui 仓库的社区插件（task-board、aionui-panel 等）印证同样模式：能走 slot 的走 slot，**slot 覆盖不到的地方（侧边栏加条目、右侧面板）就退化为 MutationObserver + DOM 注入的野生契约**。

### 1.3 组件交付格式已事实标准化

预构建 CJS bundle（`lib/client.js`）+ `window.__ModuleLoader__` + 固定种子模块（react、cordis、ui-slots 等）+ CSS Modules 内联为 `<style data-plugin>`，卸载自动清理。构建期还有"纯度门"拒绝非种子模块的值导入。**这套可以直接写进标准，不用发明新格式。**

### 1.4 社区讨论里的 UI 诉求（issue #23/#24）

- Qiuner：组合规则要机器可判定——`workspace.panel: many，shell 负责组合和呈现`；`shell.root: shell owned only`
- r05En1cU / Lipraty：page → layer → slot → component 跨端 UI 层提案（dsh-neoforge 有实现）
- morlay：Web 端 panel 状态走 URL query 持久化（grafana 式）；Qiuner 建议归 `presentation.urlState`，字段白名单、不存 secret
- T-Auto：TUI 宿主会公示能力子集（`ui.statusbar` 等），私有能力打 `x-tui.` 前缀
- qing3a 的 manifest 示例里已经出现了 `ui.panel` / `ui.tray` 能力名

### 1.5 参考实现 dsh-neoforge 的启示

page/layer/slot/component 四层 + 统一 vnode + SurfaceAdapter，62 行 vnode 模型实现了 webui/tui 双端投影——**跨端声明式 UI 唯一被验证过的路径**。但它的 slot 只有 `order`，没有基数/组合语义（官方 slot 的 kind 恰好补这个）；它的 webui adapter 最终翻译回官方 `ctx.slots.register`——说明这套层是**官方 slot 之上的可移植声明层，不是替代品**。另注意其 TUI adapter 只是玩具级投影（button 渲染成 `[label]`），文档领先于实现。

### 1.6 命令系统的协议缺口

官方 `CommandDefinition = { name, description, input?, handler }`——**descriptor 层面就没有子命令树字段**，handler 拿一整段 `rawInput` 自行解析。社区反馈的"Remote SSH 丢子命令"不是传输 bug，是协议里没有这个结构。

## 2. 从证据推出的五条设计原则

1. **标准的词汇 = slot 模型的声明式投影。** kind（single/list/keyed/chain）就是贡献点的基数语义，scope 就是激活上下文，`id/order/label/locale` 就是贡献元数据。宿主把 manifest 声明翻译成 `slots.register` 调用，插件不写注册代码。
2. **先补缺口，再规范存量。** 优先级由"插件被迫 patch/DOM 注入的程度"决定：右侧面板 > 侧边栏条目 > 命令子树 > 其他。
3. **声明与代码分离，组件懒加载。** 纯声明的视图（静态文本、列表）宿主原生渲染，连 bundle 都不用加载；富组件才指向 bundle。这和"装之前就知道装不了"的协商哲学一致。
4. **主题契约 = 令牌 + 稳定钩子注册表。** 皮肤插件的整个实现建立在 `--dsw-*` 令牌和 `data-*` 钩子上，而宿主目前对它们零承诺。要么升格为契约，要么补槽消灭这类需求。
5. **跨端（TUI）是远期目标，不阻塞 Web 先行。** TUI 保真度证据薄弱；TUI 宿主按 T-Auto 的模式公示能力子集即可，缺的 location 协商时自然拒载/降级。

## 3. 目标形态：`contributes.views`（v1alpha1 草案）

### 3.1 manifest 声明

```jsonc
{
  "requires": {
    "contracts": [
      { "apiVersion": "views.dsh/v1alpha1", "kind": "ViewContribution" }
    ]
  },
  "contributes": {
    "views": [
      {
        "id": "com.example.hello-dsh.sidebar",
        "title": "Hello World",
        "location": "sidebar.footer",        // 贡献点坐标，见 registry
        "priority": "normal",                // 类别制，禁止硬编码数字 order
        "when": "session",                   // scope: root | session
        "component": "dist/views/sidebar.js" // 富组件 bundle；纯声明视图可省略
      }
    ]
  }
}
```

### 3.2 location 贡献点目录（进 registry，按优先级分期）

| location | 基数 | 证据 | 分期 |
| --- | --- | --- | --- |
| `conversation.tab` | list | 3/4 插件在用，宿主已成熟 | 一期 |
| `details.panel` | list | travel、aionui-panel 两个插件各自手工 patch 宿主补出 | **一期（最大缺口）** |
| `sidebar.footer` | list | task-board 被迫 MutationObserver 注入 | 一期 |
| `settings.section` / `settings.item` | list | 宿主已 schema 驱动，最接近声明式 | 二期 |
| `chat.commandview` | keyed | 宿主已有，按命令名 dispatch | 二期 |
| `chat.node` | keyed | 按消息节点类型 dispatch | 二期 |
| `tool.view` | keyed | 按工具名 dispatch | 二期 |
| `input.left` / `input.right` / `composer.dock` | list | 输入区小件，最低门槛入口 | 二期 |
| `shell.overlay` | list | 挂件/浮层（皮肤插件的 `<aside>`） | 三期 |
| 主题/皮肤（令牌覆盖 + 钩子契约） | — | galgame 皮肤整套实现 | 三期 |
| TUI 投影（`statusbar` 等子集） | — | neoforge 证据弱，T-Auto 能力子集模式 | 四期 |

### 3.3 组合规则（回应 Qiuner）

每种基数对应机器可判定的组合规则：

- `list`：many，按 `priority` 类别（`high | normal | low`）+ 声明顺序排列，**禁止数字 order**（现状 order 20/30/40 靠插件间互相引用注释对齐，是隐式耦合）
- `keyed`：按 key dispatch，同 key 冲突 = 安装前静态检出
- `single`：宿主保留（`shell.root: shell owned only`），插件不可贡献
- `chain`：一期不开放

### 3.4 组件交付格式（把事实标准写成契约）

- 预构建 CJS bundle + 种子模块清单（react / cordis / ui-slots 等）写进 spec，宿主冻结模块表应答
- CSS Modules 内联为 `<style data-plugin>`，卸载清除
- 视图组件接收宿主注入的标准 props（`sessionId`、数据面），宿主服务经 `contracts.get(坐标)` 领取——和 facet-api 的统一窗口是同一扇门
- 纯声明视图（无 `component` 字段）：`{ "static": { "text": "Hello World" } }` 这类宿主原生渲染的极简形态，覆盖 Hello World 教程第六步

### 3.5 命令子命令树（并入本 RFC 或独立轻量 RFC）

`CommandDescriptor` 增加可选 `subcommands` 递归结构，协议层补齐后 Remote SSH 场景自然解决。改动小、痛点实，建议并入。

### 3.6 主题契约（三期）

- `--dsw-*` 语义令牌清单进 registry（静态调色板 + 别名两层，亮暗双值）
- 稳定 DOM 钩子（`data-pane`、`data-composer-seat` 等）建注册表 + 弃用政策
- 主题互斥与卸载可逆（现状靠外部脚本管理互斥）

### 3.7 Web 端状态持久化（三期，回应 morlay/Qiuner）

`presentation.urlState` 能力：panel 激活态、focused session 走 URL query，字段白名单 + 大小限制 + 插件 domain 隔离 + 不存 secret。TUI/headless 不绑定此模型。

## 4. 与 RFC 0002 的关系

本规划刻意**不需要** RFC 0002 的 Runtime/Presentation 传输层：所有 location 都是"宿主本地渲染插件声明/组件"，没有插件 UI 代码穿越 transport。Remote SSH 场景下，视图声明随 manifest 走（静态 JSON 天然可传输）；组件 bundle 是否下发远端客户端，那是 RFC 0002 定稿后的事。到那时，本规划的 location 目录和基数语义就是它的本地退化形态，不冲突。

`client` / `worker` 保留名仍归 RFC 0002；本规划的视图组件跑在宿主 Presentation 进程内，trust 档位与 v0.15 一致（trusted-in-process，不承诺沙箱）。

## 5. 路线图

| 期 | 内容 | 产出 |
| --- | --- | --- |
| 一期（RFC 0005，目标 v0.16） | `contributes.views` + 三个 location（conversation.tab / details.panel / sidebar.footer）+ 组合规则 + 组件交付契约 + 命令子树 | RFC Draft → 评审 → registry 条目 + schema + fixtures；dsh-web-ui 做首个落地宿主；Hello World 第六步改写为真实契约 |
| 二期 | 设置项、keyed 渲染器（commandview / chat.node / tool.view）、输入区小件 | registry 条目扩充 |
| 三期 | 主题契约（令牌 + 钩子注册表）、shell.overlay 挂件、urlState | 独立 RFC 或 0005 修订 |
| 四期 | 与 RFC 0002 合流：跨端 vnode、TUI 投影、远端 Presentation | 依赖 0002 定稿 |

## 6. 留给表决的决策点

> **注记（2026-08-20）**：以下六点已在 [RFC 0005](../rfcs/0005-declarative-views.md) "起草者建议"一节给出结论，本节保留为调研快照。

1. location 坐标命名：扁平字符串（`conversation.tab`）还是 `apiVersion + kind` 契约坐标（`views.dsh/v1alpha1` + kind）？起草者倾向后者，与元协议一致。
2. `priority` 类别制是否够用，还是需要 `before/after` 相对声明？
3. 纯声明视图的极简形态（static text/list）边界画在哪——只够 Hello World，还是要覆盖 Markdown？
4. 命令子命令树并入本 RFC 还是独立？
5. 组件 bundle 的种子模块清单冻结节奏：随 spec 版本走还是独立 registry 条目？
6. 主题契约里 DOM 钩子是升格注册表，还是补槽消灭需求（起草者倾向后者优先、注册表兜底）？

## 附：调研来源

- 插件源码：dsh-activity-plugin、dsh-tavern-plugin、dsh-travel-plugin、dsh-galgame-like-skin（2026-08-20 各自 HEAD）
- 官方本体：deepseek-harness（`packages/client/ui-slots`、`ui-conversation`、`ui-settings` 等）
- 社区宿主：dsh-web-ui 0.1.1（slot 清单、种子模块、纯度门、设置接入路径）
- 参考实现：dsh-neoforge `src/ui/`（page/layer/slot/component + 统一 vnode；注意其 TUI adapter 文档领先于实现）
- 讨论：community#23（13 条评论）、#24
