# `views.dsh/v1alpha1` — ViewContribution

> **状态：Draft（社区讨论稿，非官方标准；坐标为示意，以 Registry 定案为准）。依据 [RFC 0005](../../rfcs/0005-declarative-views.md)，目标版本 v0.16。**
> 机器可读条目：[views.dsh-v1alpha1.json](views.dsh-v1alpha1.json)

这条契约管"插件向宿主界面声明一个视图"：插件在 manifest 里写 `contributes.views`，说自己有什么视图、建议摆在哪里，宿主负责渲染。插件作者声明视图时读本条目；宿主维护者实现视图发现、排布与渲染时也读本条目。

## 语义

**插件声明"有什么"，宿主决定"摆不摆、摆成什么样"：**

- 视图元数据（ID、标题、位置）的权威来源是 manifest `contributes.views`——宿主在插件运行前就能发现这些视图，"装之前就知道装不了"覆盖到 UI。
- 宿主可以把同一个视图渲染成页签、下拉菜单或别的形态，但**不能改变它的身份**：同一个 ID 指向同一份声明。
- 视图注册的整个生命周期挂在 activation 上：deactivate 时自动卸载，重复激活可重入（见 [RFC 0005](../../rfcs/0005-declarative-views.md) §5 与 [spec/lifecycle.md](../../spec/lifecycle.md)）。
- 排布规则机器可判定：list 位置按 `priority`（`high | normal | low`）排列，同优先级按 manifest 声明顺序，禁止数字 order；keyed 位置同 key 冲突在安装前静态检出（规则见 [RFC 0005](../../rfcs/0005-declarative-views.md) §4）。

## location 目录

视图位置（location）是标准契约：插件不得声明本目录里不存在的位置，宿主不得自造未登记的位置名。新增 location 走本条目修订，不改 manifest 格式。本目录是 location 的**权威清单**，随条目版本演进。

| location | 语义 | 基数 | 作用域 |
| --- | --- | --- | --- |
| `conversation.tab` | 对话区页签 | list | session |
| `details.panel` | 右侧面板 | list | session |
| `sidebar.footer` | 侧边栏底部 | list | root |
| `settings.section` | 设置整页 | list | root |
| `settings.item` | 设置项 | list | root |
| `input.left` | 输入框左侧 | list | session |
| `input.right` | 输入框右侧 | list | session |
| `composer.dock` | 输入框下方统计行 | list | session |
| `shell.overlay` | 全局浮层 | list | root |
| `chat.commandview` | 命令视图（按命令名分发） | keyed | 按命令名 |
| `chat.node` | 消息节点渲染器（按消息节点类型分发） | keyed | 按消息节点类型 |
| `tool.view` | 工具视图（按工具名分发） | keyed | 按工具名 |

上表 12 个位置全部随 v1alpha1 生效（原分期规划已合并为一次落地，见 [RFC 0005](../../rfcs/0005-declarative-views.md) §7）。宿主可以实现子集：未实现的 location 在协商时按 required 拒载、optional 降级处理（见 [spec/negotiation.md](../../spec/negotiation.md)）。

## 明确不包含什么

| 不包含 | 一句话原因 | 归属 |
| --- | --- | --- |
| 远端 Presentation 传输（组件 bundle 要不要下发到远端客户端渲染） | 跨端渲染是 Runtime / Presentation 分层的事 | [RFC 0002](../../rfcs/0002-runtime-presentation.md) |
| 主题/皮肤（设计令牌、DOM 钩子承诺） | 独立契约，独立演进 | [`themes.dsh/v1alpha1`](themes.dsh-v1alpha1.md) |
| 富组件 bundle 的共享依赖清单 | 跟着宿主发布节奏走，独立版本化 | [`webseeds.dsh/v1alpha1`](webseeds.dsh-v1alpha1.md) |

## 用法示例

manifest 声明（字段布局为示意，以 [spec/manifest.md](../../spec/manifest.md) 与 Registry 定案为准）：

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
        "priority": "normal",
        "when": "root",
        "component": "dist/views/sidebar.js"
      }
    ]
  }
}
```

`requires` 声明让宿主在安装前做协商：宿主没有这个 location 就干净拒载或降级，和 v0.15 的能力协商同一套机制（见 [spec/negotiation.md](../../spec/negotiation.md)）。纯声明视图（无 `component` 字段）只给标题加静态文本，宿主原生渲染，连 bundle 都不用加载。

## 敏感级别

**低**（机器可读条目中 `sensitivity: low`）：视图声明本身是静态描述——ID、标题、位置，不含用户数据。视图渲染后能看到什么数据，取决于它另行协商的能力，不在本条目范围内。

## 对应 v0.1 名字

无。本条为 v0.16 新增契约（[RFC 0005](../../rfcs/0005-declarative-views.md)），v0.1 没有对应的平面能力名。
