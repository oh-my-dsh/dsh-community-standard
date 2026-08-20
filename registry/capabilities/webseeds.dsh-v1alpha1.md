# `webseeds.dsh/v1alpha1` — SeedModules

> **状态：Draft（社区讨论稿，非官方标准；坐标为示意，以 Registry 定案为准）。依据 [RFC 0005](../../rfcs/0005-declarative-views.md)，目标版本 v0.16。**
> 机器可读条目：[webseeds.dsh-v1alpha1.json](webseeds.dsh-v1alpha1.json)

这条契约管"Web 宿主给富组件 bundle 注入哪些共享依赖"：插件的视图组件不自己打包 react 这类库，由宿主在加载时注入——这份"宿主注入什么"的清单就是种子模块清单。写富组件的插件作者读本条目；Web 宿主维护者发布种子清单时也读本条目。

## 语义

**清单独立版本化，跟着宿主发布节奏走：**

- 富组件 bundle 的外部依赖（react、cordis 等）由宿主注入，插件不重复打包——这是社区已跑通的形态，本条目把它写成明规则（背景见 [RFC 0005](../../rfcs/0005-declarative-views.md) §5）。
- 清单锁进 spec 版本会拖住宿主升级，所以它独立成一条 registry 条目、单独版本化：宿主升级种子，不用等 spec 发版。
- 每个宿主实际提供的种子模块及版本，**以宿主 Host Descriptor 公示为准**（见 [spec/host-descriptor.md](../../spec/host-descriptor.md)）；本条目定的是清单的坐标、初始内容与演进规则。

## 初始清单

| 模块 | 用途 |
| --- | --- |
| `react` | 组件运行时 |
| `react/jsx-runtime` | JSX 转换产物运行时 |
| `react-dom` | DOM 渲染器 |
| `react-dom/client` | React 18+ 客户端入口 |
| `@deepseek-ai/cordis` | 宿主服务框架（与 host facet 同一套上下文） |

初始集，以宿主 Host Descriptor 公示为准；新增或移除种子走本条目修订。

## 规则

- **插件不得 import 清单以外的官方包。** 这是 SDK 抽象层的两条禁令之一（另一条是不得依赖未登记的 DOM 钩子，见 [`themes.dsh/v1alpha1`](themes.dsh-v1alpha1.md)）——违反者视为使用私有 API，宿主可以拒载。要用的包不在清单里？提条目修订，不要绕道。
- **宿主升级种子版本，必须同步更新本条目并公示。** 种子变化是 breaking 风险源（react 大版本就是），藏着掖着等于让插件盲飞；更新条目 + Host Descriptor 公示，插件作者才有迁移的依据。

## 敏感级别

**无**：清单是公开的包名列表，不含任何用户数据（机器可读条目按 `low` 记）。

## 对应 v0.1 名字

无。本条为 v0.16 新增契约（[RFC 0005](../../rfcs/0005-declarative-views.md) §5 种子模块清单的落地条目），v0.1 没有对应的平面能力名。
