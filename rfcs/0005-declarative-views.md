# RFC 0005: 声明式视图贡献点（Declarative View Contributions）

> **状态：Draft（社区讨论稿，非官方标准）**

## 元信息

| 字段 | 内容 |
| --- | --- |
| 编号 | 0005 |
| 标题 | 声明式视图贡献点 |
| 状态 | Draft |
| 目标版本 | v0.16 |
| 范围 | 插件向宿主界面声明视图（对话 tab、右侧面板、侧边栏条目等）的 manifest 字段、组合规则、组件交付格式，以及命令子命令树；不管远端 Presentation 传输（那是 [RFC 0002](0002-runtime-presentation.md) 的事） |
| 依赖 | [RFC 0001](0001-core-contract.md)、[spec/manifest.md](../spec/manifest.md)、[spec/facet-api.md](../spec/facet-api.md)（草案）、调研证据见 [research/ui-layer-plan.md](../research/ui-layer-plan.md) |
| 讨论方式 | [omdsh-dev/community](https://github.com/omdsh-dev/community) |

## 一句话摘要

插件在 manifest 里声明"我有一个视图，建议摆在哪里"，宿主负责渲染——让"装之前就知道装不了"覆盖到 UI，让 patch 宿主界面这件事彻底消失。

## 背景

v0.15 刻意不做 UI：`client` / `worker` 是保留名，跨端声明式 UI 整体延期到 RFC 0002。但 2026-08 的实证调研（[research/ui-layer-plan.md](../research/ui-layer-plan.md)）发现，社区已经用脚投票把 UI 做出来了，而且做得很难看：

- **四个热门插件里有三个**靠宿主的内部 slot 系统注册对话区 tab。这个系统不是公开契约，官方从来没有承诺过它稳定。
- **右侧面板是最大的缺口。** 官方 shell 的 `details` 区域没有给插件留槽位，于是两个互不相干的插件（dsh-travel-plugin、dsh-aionui-panel）各自手工 patch 宿主包，硬补出一个面板槽。官方一改版，两个一起炸。
- **想往侧边栏加个条目，只能 MutationObserver 注入 DOM。** 插件作者自己也知道这是野路子——代码注释里写着"因为宿主没有给侧边栏留 additive 槽"。
- **皮肤插件的整个实现建立在零承诺的钩子上。** `--dsw-*` 设计令牌和 `data-pane` 这类 DOM 属性，宿主对它们没有注册表，也没有弃用政策，社区消费方全部按"钩子随时会漂移"来写自愈代码。

与此同时，官方本体已经把路修好了大半：slot 系统有完整的基数语义（single/list/keyed/chain）和作用域（root/session），组件交付格式（预构建 bundle + 种子模块）已经在社区成了事实标准，设置页已经是 schema 驱动的声明式。**标准要做的不是发明一套新 UI 层，而是把已经存在的潜规则变成明规则。**

另一个背景是命令系统：官方命令描述符只有 `{ name, description, input? }`，**协议里根本没有子命令树这个字段**——issue #23 里"Remote SSH 丢子命令"的抱怨，根因在此，不是传输 bug。

## 目标

- 插件声明一个对话 tab / 右侧面板 / 侧边栏条目，只需要改 manifest，不需要写注册代码。
- 宿主在**安装前**就能判断"这个插件要的视图位置我有没有"，没有就干净拒载或降级——和 v0.15 的能力协商同一套机制。
- 两个插件往同一个位置贡献视图时，排布规则是机器可判定的，不靠加载顺序，不靠插件间互相抄 order 数字。
- 官方改内部 UI 实现时，插件零感知——变化由 SDK 抽象层吸收（见设计 §3）。
- 命令描述符支持子命令树，Remote SSH 场景不再丢子命令。

## 非目标

- **不做远端 Presentation 传输。** 视图声明随 manifest 走（静态 JSON 天然可传输），但"组件 bundle 要不要下发到远端客户端渲染"是 [RFC 0002](0002-runtime-presentation.md) 的范围。
- **不占用 `client` / `worker` 保留名。** 视图组件跑在宿主 Presentation 进程内，信任档位与 v0.15 一致（trusted-in-process，不承诺沙箱）。
- **不发明新的 UI 组件模型。** 不引入自研 vnode、自研渲染层（那条路的评估见"被拒绝的替代方案"）。
- **一期不做主题/皮肤契约**（设计令牌注册表、DOM 钩子承诺），不做 keyed 渲染器（消息节点、工具视图），不做 TUI 投影。分期见设计 §7。
- **不做包管理与分发。**

## 设计

### 1. 核心模型：声明位置，宿主渲染

插件在 manifest 的 `contributes.views` 里声明视图（字段布局示意，规范本体随本 RFC 进 spec/）：

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
        "location": "sidebar.footer",         // 摆在哪，见 §2 目录
        "priority": "normal",                 // 排布优先级，见 §4
        "when": "session",                    // 作用域：root | session
        "component": "dist/views/sidebar.js"  // 富组件 bundle；纯声明视图可省略
      }
    ]
  }
}
```

一句话原则：**插件声明"有什么"，宿主决定"摆不摆、摆成什么样"。** 宿主可以把 `conversation.tab` 渲染成 tab、下拉菜单或者快捷键面板——插件不关心，也不能关心。

### 2. location 目录：贡献点进 registry

视图位置（location）是标准契约：插件不得声明 registry 里不存在的位置，宿主不得自造未登记的位置名。location 用扁平字符串（`conversation.tab`），但它的枚举和语义由 `views.dsh/v1alpha1` 的 registry 条目定义，随条目版本演进。契约坐标留给"能力"，位置名是能力的领域语义，两套命名法只背一套。新增 location 走 registry 条目修订，不改 manifest 格式。一期只收三个（按插件被迫 patch 的严重程度排序）：

| location | 语义 | 基数 | 证据 |
| --- | --- | --- | --- |
| `conversation.tab` | 对话区视图页签 | list（多个共存，按优先级排列） | 4 个热门插件里 3 个在用 |
| `details.panel` | 右侧详情面板 | list | 两个插件各自手工 patch 宿主补出 |
| `sidebar.footer` | 左侧边栏底部条目 | list | 社区插件靠 MutationObserver 注入 DOM |

后续期次的候选位置（设置页、输入区小件、浮层挂件、消息节点渲染器等）已在调研稿里列出，每期进 registry 前走各自的评审。

### 3. SDK 抽象层：官方变，插件不炸

这是本 RFC 的结构性承诺，也是整个标准"穿越上游更新周期"的立身之本。分层是这样：

```text
插件代码 ──只依赖──▶ SDK 契约面（manifest 字段 + contracts.get 拿到的句柄）
                        ▼
              版本化适配层（唯一允许吸收官方变化的层）
                        ▼
              官方 dsh 内部实现（slot 系统、种子模块、DOM 结构——全部可变）
```

具体含义：

- **插件看到的是契约，不是官方 API。** manifest 里的 `location`、代码里的 `contracts.get(坐标)`，都是标准定义的词汇。官方的 slot 名、注册函数签名、内部服务路径，插件一概不碰。
- **官方内部的每一次变化，由适配层吸收。** 官方把 `details` 改成别的名字、把 slot 注册函数换个签名、升级种子模块版本——适配层出新版本跟上，插件的 manifest 和代码一行不改。这正是 v0.1 四层模型里"版本化 DSH Adapter"在 UI 侧的落地。
- **两条禁令兜底**：插件不得 import 种子模块清单以外的官方包；不得依赖未登记的 DOM 钩子（`data-*` 属性）。违反者视为使用私有 API，宿主可以拒载——没有这两条，抽象层就是漏的。
- **社区已经在这么干了，只是没有名分。** 热门插件的 `src/contract.ts` 都在本地声明最小结构契约、避免 import 未发布的官方内部包。本 RFC 把这个民间智慧升格为标准义务，由 SDK 和校验工具统一承担。

### 4. 组合规则：排布是机器可判定的

每种基数对应一条判定规则，宿主在**安装前**做静态检查：

- **list（多个共存）**：按 `priority` 排列，取值 `high | normal | low`，同优先级按 manifest 声明顺序。**禁止数字 order**——现状是插件硬编码 20/30/40 并在注释里互相引用对方的数字，这是隐式耦合，两个互不相识的插件无法对齐。
- **keyed（按键分发）**：同 key 冲突在安装前静态检出，报告给市场/启动器。
- **single（独占）**：宿主保留，插件不可贡献（对应 Qiuner 在社区讨论里提的 `shell.root: shell owned only`）。
- **chain（接管链）**：一期不开放。

### 5. 组件交付格式：把事实标准写成契约

富组件（带 `component` 字段的视图）的交付格式，直接采纳社区已跑通的形态：

- 预构建单文件 bundle，经宿主模块加载器加载；**种子模块清单**（react、cordis 等宿主注入的共享依赖）独立成一条 registry 条目、单独版本化——它跟着官方宿主的发布节奏跑，锁进 spec 版本会拖住宿主升级。
- 样式走 CSS Modules 内联，带插件标记注入，卸载即清除。
- 组件接收宿主注入的标准 props；需要宿主服务（布局动作、会话选择等）时，经 `contracts.get(坐标)` 领取——和 host facet 是同一扇统一窗口，不多开一扇门。
- 视图注册的整个生命周期挂在 activation 上：deactivate 时自动卸载，重复激活可重入——与 [spec/lifecycle.md](../spec/lifecycle.md) 的纪律一致。
- **纯声明视图**（无 `component` 字段）：插件只给数据——标题加静态文本，就这么多，v1alpha1 不支持 Markdown（支持它就得连渲染器和消毒契约一起定，范围爆炸）。宿主原生渲染，连 bundle 都不用加载，TUI 宿主也能接。这是"Hello World 摆进侧边栏"的最小形态。

### 6. 命令子命令树

命令描述符增加可选的 `subcommands` 递归结构（名称、描述、输入提示），随命令目录一起下发。改动小，补上 issue #23 确认的协议缺口：远端客户端从此能看到完整的命令层级，不再只有根命令。

### 7. 分期路线图

| 期 | 内容 |
| --- | --- |
| **一期（本 RFC，v0.16）** | `contributes.views` + 三个 location + 组合规则 + 组件交付契约 + SDK 抽象层义务 + 命令子命令树 |
| 二期 | 设置项贡献（schema 驱动表单）、keyed 渲染器（命令视图、消息节点、工具视图）、输入区小件 |
| 三期 | 主题契约（`--dsw-*` 令牌注册表 + 稳定 DOM 钩子承诺 + 互斥规则）、浮层挂件、Web 端 urlState 状态持久化（字段白名单、不存 secret，见 issue #24 讨论） |
| 四期 | 与 RFC 0002 合流：跨端组件模型、TUI 投影、远端 Presentation |

每期都有独立的 registry 条目、schema 和 fixtures；后一期展开时如发现一期的设计要修，走勘误 RFC，不回改本文件。

## 被拒绝的替代方案

1. **整体转正 RFC 0002 再顺手解决 UI。** 是什么：把 Runtime / Presentation / Control / Transport / Invocation 五层一次定稿。为什么拒：0002 的 Final 门槛要求 SSH transport adapter 落地、两个独立 Presentation 实现跑同一套件，外加 10 条未表决的开放问题，以季度计；而插件今天就在 patch 宿主界面。重新考虑的条件：本 RFC 的 location 目录和组合语义已按"未来可被 0002 收编为本地退化形态"设计，四期自然合流。
2. **自造一套跨端 UI 层（page/layer/slot/component + 统一 vnode），替代官方 slot。** 是什么：社区参考实现 dsh-neoforge 的路线。为什么拒：它的 webui 适配器最终仍翻译回官方 slot 注册——说明它是官方 slot 之上的可移植声明层，不是替代品；且其 TUI 投影只是玩具级，跨端保真度证据不足。它的 layer 模型和"一切皆 effect"的生命周期纪律已被本 RFC 吸收，跨端 vnode 留到四期与 0002 合流时评估。重新考虑的条件：出现两个以上有真实用户的非 Web 宿主，且 Web 先行方案被证明无法退化到它们。
3. **维持现状：宿主继续暴露内部 slot API，插件继续代码注册。** 为什么拒：slot 目录是编译期 TypeScript 声明合并，运行时不自描述、无版本协商；SDK 类型与部署 shell 已经漂移，插件靠本地类型补丁续命。没有 manifest 声明，"装之前就知道"覆盖不到 UI，协商、溯源、市场过滤全都无从下手。

## 起草者建议（原开放问题）

以下六个问题在调研中已有足够证据给出建议，按 [RFC 0000](0000-governance.md) 的 lazy consensus，评审期内无实质异议即按建议生效：

1. **location 坐标形态 → 扁平字符串，枚举由 registry 条目定义。** 契约坐标（`apiVersion + kind`）只用于"能力"本身；位置名是能力的领域语义，跟着条目版本走。插件作者只背一套命名法（已按此写入 §2）。
2. **priority 三档够用，不做 before/after。** before/after 要按 id 指名别的插件，那是插件间的具名耦合——比数字 order 更糟，至少数字还能撞得随机。真有排布诉求，等出现两个抢位置的插件再走勘误 RFC 加。
3. **纯声明视图只做标题 + 静态文本。** 支持 Markdown 就得连渲染器和消毒契约一起定，一期范围爆炸；Hello World 和状态展示用纯文本足够（已按此写入 §5）。
4. **命令子命令树并入本 RFC。** 改动是一个可选递归字段，单独走一份 RFC 只增加流程开销，不产生额外评审价值（已按此保留 §6）。
5. **种子模块清单独立成 registry 条目，单独版本化。** 它跟着官方宿主的发布节奏跑；锁进 spec 版本意味着宿主每升级一次种子就要等一次 spec 发版（已按此写入 §5）。
6. **主题契约：补槽优先、注册表兜底。** 三期展开时先盘点现有 DOM 注入需求里有多少能被新 location 直接消灭；剩下消灭不掉的（如 composer 区域样式），再把对应钩子建注册表并配弃用政策。不为还没出现的需求提前承诺 DOM 结构。

## 变更记录

| 日期 | 变更 |
| --- | --- |
| 2026-08-20 | 初稿（依据 [research/ui-layer-plan.md](../research/ui-layer-plan.md) 的实证调研） |
