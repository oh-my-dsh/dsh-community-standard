# Spec: 视图贡献点（View Contributions）

> **状态：Draft（社区讨论稿，非官方标准）｜ 依据 [RFC 0005](../rfcs/0005-declarative-views.md)，目标版本 v0.16**
> 每条"必须"对应的测试样本，统一列在文末 [§8 错误表](#8-错误与边界情况) 和 [§9 fixtures 清单](#9-对应-fixtures-清单)，正文不再逐条标注。

## 0. 这份文档管什么

一句话：**插件在 manifest 里声明"我有一个视图，建议摆在哪里"，宿主负责渲染。** 本文规定 `contributes.views` 的字段语义、location 目录、组合规则、组件交付格式、设置项贡献和 urlState 持久化。设计动机与证据见 [RFC 0005](../rfcs/0005-declarative-views.md) 与 [research/ui-layer-plan.md](../research/ui-layer-plan.md)——简单说，社区插件今天靠 patch 宿主包、MutationObserver 注入 DOM 来加 UI，官方一改版就全炸；本文把这些潜规则变成明规则。

以下内容不在本文：

- manifest 的顶层字段与静态性要求 → [manifest.md](manifest.md)
- 视图注册的激活/卸载纪律 → [lifecycle.md](lifecycle.md)
- `contracts.get` 统一窗口 → [facet-api.md](facet-api.md)
- 主题/皮肤契约（`contributes.themes`、设计令牌、DOM 钩子）→ [themes.md](themes.md)

## 1. manifest 声明

使用本契约的插件**必须**在 `requires.contracts` 中声明契约坐标 `views.dsh/v1alpha1`（kind: `ViewContribution`），然后在 `contributes.views` 数组里逐条声明视图。不声明契约坐标就贡献视图，等于跳过了"装之前就知道装不了"的协商环节——宿主对这样的 manifest 必须按 required 契约缺失处理（见 [negotiation.md](negotiation.md)）。

`contributes.views` 每个条目的字段：

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `id` | string | **是** | 视图全局唯一 ID，反向域名语法（同 [manifest.md §3.4](manifest.md)），应该以插件自身 `id` 为前缀 |
| `title` | string | **是** | 人读标题，宿主直接拿去渲染（页签名、面板标题等） |
| `location` | string | **是** | 摆在哪，取值见 §2 目录；未登记的位置必须校验失败 |
| `priority` | string | 否 | `high \| normal \| low`，缺省 `normal`；组合规则见 §3 |
| `when` | string | 否 | 作用域 `root \| session`，缺省由 location 决定（每个 location 的 scope 见 §2）；显式声明的值**必须**与该 location 的 scope 一致 |
| `key` | string | 视情况 | keyed 型 location **必填**，取值含义由 location 定义（命令名、消息节点类型、工具名）；list 型 location 不得携带 |
| `component` | string | 二选一 | 富组件 bundle 路径，包内相对路径（§5） |
| `static` | object | 二选一 | 纯声明视图 `{ "text": string }`（§4） |

`component` 与 `static` **必须**恰好出现一个。两个都出现，宿主无法判断该加载 bundle 还是原生渲染，必须拒绝；两个都不出现，这个视图没有内容，同样必须拒绝。

完整示例（坐标与路径为示意，以 Registry 定案为准）：

```json
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
        "location": "sidebar.footer",
        "static": { "text": "Hello from dsh!" }
      },
      {
        "id": "com.example.hello-dsh.dashboard",
        "title": "仪表盘",
        "location": "conversation.tab",
        "priority": "high",
        "component": "dist/views/dashboard.js"
      }
    ]
  }
}
```

一句话原则：**插件声明"有什么"，宿主决定"摆不摆、摆成什么样"。** 宿主可以把 `conversation.tab` 渲染成页签、下拉菜单或快捷键面板，插件不关心，也不能关心——关心了，就又回到依赖宿主内部实现的老路上。

## 2. location 目录

location（视图位置）是标准契约的一部分：插件**不得**声明 registry 里不存在的位置，宿主**不得**自造未登记的位置名。位置名用扁平字符串（`conversation.tab`），其枚举与语义的**唯一权威来源是 `views.dsh/v1alpha1` 的 registry 条目**，随条目版本演进；本文下表是 v1alpha1 的全量快照。新增 location 走 registry 条目修订，不改 manifest 格式。为什么进 registry 而不是写死在 spec 里：位置目录会随产品演进长大，每次加位置都发一版 spec，宿主和插件都被拖着走。

v1alpha1 共 12 个 location：

| location | 基数 | scope | 说明 |
| --- | --- | --- | --- |
| `conversation.tab` | list | session | 对话区视图页签：与会话绑定的主视图，如活动仪表盘 |
| `details.panel` | list | session | 右侧详情面板：展示当前选中对象的细节——v0.15 时代最大的缺口，两个插件曾各自手工 patch 宿主补出 |
| `sidebar.footer` | list | root | 左侧边栏底部条目：全局入口，如设置、状态指示 |
| `settings.section` | list | root | 设置整页：插件独占的设置分区 |
| `settings.item` | list | root | 通用设置页中的一项：塞进宿主既有设置页的单个条目 |
| `input.left` | list | session | 输入框左侧小件：图标、按钮级别的挂件 |
| `input.right` | list | session | 输入框右侧小件：同上，靠右 |
| `composer.dock` | list | session | 输入框下方统计行：字数、token 数一类的一行信息 |
| `shell.overlay` | list | root | 全局浮层挂件：挂在 shell 之上的浮动元素 |
| `chat.commandview` | keyed（key = 命令名） | session | 命令结果卡片渲染器：某条命令的输出用这个组件渲染 |
| `chat.node` | keyed（key = 消息节点类型） | session | 消息节点渲染器：自定义消息块（如卡片、表单）的渲染 |
| `tool.view` | keyed（key = 工具名） | session | 工具详情渲染器：某个工具调用的展开详情 |

两个术语就地解释：

- **基数**（list / keyed）决定多个贡献如何共存，组合规则见 §3。
- **scope**（root / session）决定视图挂在哪个生命周期上：`root` 随宿主全局存活，`session` 随会话创建和销毁。`when` 字段缺省时取这里的值；显式声明一个和 location scope 不一致的 `when` 是自相矛盾，必须校验失败。

## 3. 组合规则

每种基数对应一条机器可判定的规则，宿主在**安装前**做静态检查。为什么强调"机器可判定"：靠加载顺序决定排布，重装一次插件界面就变样；机器可判定的规则让市场、CI 和宿主算出同一个结果。

- **list（多个共存）**：按 `priority` 三档（`high | normal | low`）排列，同档按 manifest 声明顺序。**manifest 顶层及视图条目中禁止出现数字 `order` 字段**，出现必须校验失败。为什么：现状是插件硬编码 order 20/30/40 并在注释里互相引用对方的数字——两个互不相识的插件永远无法对齐，这是隐式耦合。三档类别让"我想靠前"成为可声明的意图，而不是一场数字军备竞赛。
- **keyed（按键分发）**：按 `key` 分发——`chat.commandview` 按命令名、`chat.node` 按消息节点类型、`tool.view` 按工具名。两个插件对同一 location 声明同一个 key，冲突必须在**安装前**静态检出并报告"冲突，不能共存"，而不是运行时谁后加载谁赢。
- **single（独占）**：宿主保留，插件不可贡献。界面总得有一个说了算的拥有者，否则两个插件抢同一个独占位，没有仲裁规则可言。
- **chain（接管链）**：本版不开放。接管链允许插件包装、拦截前一个渲染器，语义复杂且证据不足，等真实需求出现再定。

## 4. 纯声明视图（static）

不带 `component` 的视图是纯声明视图：插件只给数据——`title` 加一段静态文本，就这么多。宿主原生渲染，连 bundle 都不用加载，TUI 宿主也能接。这是"Hello World 摆进侧边栏"的最小形态（教程见 [guides/hello-world.md](../guides/hello-world.md)）。

v1alpha1 中 `static` **只支持 `{ "text": string }`，不支持 Markdown，更不支持 HTML**。为什么：支持 Markdown 就得连渲染器和消毒（sanitization）契约一起定——谁来渲染、允许哪些标签、 XSS 谁负责，全是新问题，范围爆炸。纯文本足够覆盖状态展示和 Hello World；真有富文本诉求，走 §5 的富组件。`static.text` 中出现 Markdown 标记或 HTML 标签的，宿主**应该**按纯文本原样展示，校验工具**应该**告警。

## 5. 富组件交付（component）

带 `component` 字段的视图指向一个**预构建单文件 bundle**（包内相对路径），经宿主模块加载器加载。这套格式直接采纳社区已跑通的事实标准（证据见 [research/ui-layer-plan.md §1.3](../research/ui-layer-plan.md)）：

- **种子模块**：react、react-dom、`@deepseek-ai/cordis` 等由宿主注入的共享依赖，插件**不得**自己打包，也**不得** import 种子清单以外的宿主内部包。种子模块清单独立成一条 registry 条目（契约坐标 `webseeds.dsh/v1alpha1`，kind: `SeedModules`）、单独版本化——它跟着官方宿主的发布节奏跑，锁进 spec 版本意味着宿主每升级一次种子就要等一次 spec 发版。具体清单以 registry 条目为准。
- **样式**：CSS Modules 内联，带插件标记注入（如 `<style data-plugin="插件 id">`），卸载时必须清除。不带标记就没法按插件清理，卸载即残留的样式是主题契约（见 [themes.md §4](themes.md)）同样禁止的事情。
- **标准 props**：宿主向组件注入约定的 props（会话标识、数据面等，具体集合由 `views.dsh/v1alpha1` registry 条目定义）。需要宿主服务（布局动作、会话选择等）时，经 `contracts.get(坐标)` 领取——和 host facet 是同一扇统一窗口，不多开一扇门（见 [facet-api.md](facet-api.md)）。
- **生命周期**：视图注册挂在 activation 上——随激活创建，deactivate 时自动卸载，重复激活可重入，与 [lifecycle.md](lifecycle.md) 的纪律一致。宿主在 deactivate 后仍残留视图或样式的，不合规。

视图组件跑在宿主 Presentation 进程内，信任档位与 v0.15 一致（trusted-in-process，不承诺沙箱）。组件 bundle 要不要下发远端客户端渲染，归 [RFC 0002](../rfcs/0002-runtime-presentation.md)，本文不管。

## 6. 设置项贡献

插件的设置不进视图组件，走 `contributes.settings` 声明，宿主据此**自动生成表单**——插件不需要为设置页写一行 UI 代码。为什么：设置页是宿主界面上最同质化的区域，每个插件各画一套表单，风格撕裂不说，TUI 宿主根本没法接；schema 驱动让宿主按自己的形态渲染同一份声明。

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `namespace` | string | **是** | 设置命名空间，反向域名语法；插件**只能**读写自己的 namespace |
| `title` | string | **是** | 设置区标题 |
| `schema` | object | **是** | 内联 JSON Schema 对象，描述设置项的字段、类型、默认值；宿主据此生成表单 |

运行时，插件代码经宿主 settings 句柄读写自己 namespace 下的值；读别人的 namespace 或写未声明的键，宿主**必须**拒绝。声明了 `contributes.settings` 的插件通常还要一个 `settings.section` 或 `settings.item` 视图入口（§2），让用户找得到这页设置——但两者独立声明，互不隐含。

## 7. urlState

Web 端插件可以把 panel 的瞬态 UI 状态（激活态、展开态、当前 tab）持久化到 URL query，刷新、分享链接后界面还原——契约坐标 `urlstate.dsh/v1alpha1`（kind: `UrlState`）。规则：

- **字段白名单**：插件**必须**在 manifest 或契约声明中列出要写入 URL 的字段名，白名单之外的字段宿主必须拒绝写入。不这么做，URL 会变成插件随意倒垃圾的隐藏存储。
- **大小上限**：单个插件写入的 urlState 总量**不得**超过 2 KB。
- **不得存 secret**：令牌、密钥、用户内容一律禁止进 URL——URL 会进浏览器历史、代理日志、截图，存 secret 等于广播。
- **降级语义**：TUI / headless 宿主没有 URL，不实现此契约**属于正常降级**，不算不支持。插件**应该**把 urlState 声明为 optional 依赖，缺失时照常运行（判定规则见 [negotiation.md](negotiation.md)）。

## 8. 错误与边界情况

| 情况 | 规定行为 | 抓住它的 fixture / 测试 |
| --- | --- | --- |
| `location` 未在 registry 登记 | 校验失败，拒绝加载 | `invalid/unknown-view-location.json` |
| `component` 与 `static` 同时出现 | 校验失败，拒绝加载 | `invalid/view-component-and-static.json` |
| `component` 与 `static` 都不出现 | 校验失败，拒绝加载 | schema 校验（无内容视图无意义） |
| keyed location 缺 `key` | 校验失败，拒绝加载 | `invalid/view-keyed-missing-key.json` |
| list location 携带 `key` | 校验失败，拒绝加载 | schema / 静态检查 |
| 视图条目出现数字 `order` 字段 | 校验失败，拒绝加载（排布只能走 `priority` 三档） | `invalid/view-numeric-order.json` |
| `when` 与 location scope 不一致 | 校验失败，拒绝加载 | suites 静态检查 |
| `static.text` 含 Markdown / HTML 意图 | 按纯文本渲染；校验工具告警 | suites 渲染断言 |
| keyed 同 key 跨插件冲突 | 安装前静态检出，报"冲突，不能共存" | suites 冲突场景 |
| 未声明 `views.dsh/v1alpha1` 契约就贡献视图 | 按 required 契约缺失拒载 | negotiation suites |
| 组件 import 种子模块清单以外的宿主包 | 视为使用私有 API，宿主可以拒载 | suites 纯度门断言 |
| deactivate 后视图或样式残留 | 不合规 | lifecycle suites |

## 9. 对应 fixtures 清单

fixtures 由后续任务创建，路径约定如下（非法样本一个文件只违反一条规则）：

| 路径 | 测法 |
| --- | --- |
| `conformance/fixtures/manifest/valid/views-theme.json` | 合法样本：同时声明 `contributes.views`（list、keyed、static 各一）、`contributes.settings` 与 `contributes.themes`（见 [themes.md](themes.md)），schema 校验必须通过 |
| `conformance/fixtures/manifest/invalid/unknown-view-location.json` | `location` 取值不在 registry 目录中，校验必须失败 |
| `conformance/fixtures/manifest/invalid/view-numeric-order.json` | 视图条目携带数字 `order` 字段，校验必须失败 |
| `conformance/fixtures/manifest/invalid/view-keyed-missing-key.json` | keyed location（如 `chat.commandview`）缺 `key`，校验必须失败 |
| `conformance/fixtures/manifest/invalid/view-component-and-static.json` | `component` 与 `static` 同时出现，校验必须失败 |

其中 `unknown-view-location.json` 的合法性依赖 registry 快照而非纯 JSON Schema——校验器必须把登记过的 location 枚举作为校验输入（约定见 [conformance/fixtures/README.md](../conformance/fixtures/README.md)）。

## 变更记录

| 版本 | 变更 |
| --- | --- |
| v0.16（目标） | 首版成稿。依据 [RFC 0005](../rfcs/0005-declarative-views.md) 与 [research/ui-layer-plan.md](../research/ui-layer-plan.md)：`contributes.views` 字段语义、12 个 location 目录、list/keyed 组合规则、纯声明视图与富组件交付契约、`contributes.settings`、urlState。 |

## 关联

- [RFC 0005：声明式视图贡献点](../rfcs/0005-declarative-views.md)——本文的设计依据
- [research/ui-layer-plan.md](../research/ui-layer-plan.md)——调研证据
- [spec/manifest.md](manifest.md)——manifest 顶层结构
- [spec/themes.md](themes.md)——主题契约（`contributes.themes`、令牌与 DOM 钩子）
- [spec/lifecycle.md](lifecycle.md)——activation 生命周期纪律
- [spec/facet-api.md](facet-api.md)——`contracts.get` 统一窗口
- [spec/negotiation.md](negotiation.md)——契约协商与拒载判定
- [registry/](../registry/README.md)——location、种子模块清单等条目的权威来源
- [VERSIONING.md](../VERSIONING.md)——契约坐标与版本规则
