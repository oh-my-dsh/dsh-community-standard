# Spec: Facet 对象模型（Facet Model）

> **状态：Draft v0.15（社区讨论稿，非官方标准）**
> 每条"必须"对应的测试样本统一列在文末 [§5 fixtures 清单](#5-fixtures-清单)，正文不再逐条标注。

这份文件定义"一个插件在标准眼里长什么样"——Component → Facet → Activation → Participant 四级对象模型，以及 v0.15 唯一有完整契约的 `host` facet。

为什么需要四级这么多？因为调研的 12 个插件样本里有 9 个同时需要宿主侧逻辑和客户端呈现——**跨面是常态，不是特例**（来源：issue #24 中 Yan-Zero 的提案，处置见 [decisions/round-2-issue-24.md](../decisions/round-2-issue-24.md)）。一个只有单一入口概念的模型，在 TUI / Web / Remote SSH 面前必然捉襟见肘，所以对象模型先把"分身"这件事说清楚。

谁该读：插件作者（写 `defineFacet` 前）、宿主维护者（实现加载与激活前）。

## 1. 适用范围

- 本文定义四级对象模型的术语与关系，以及 `host` facet 的完整契约（entry 位置、模块格式、执行环境）。
- v0.15 **只规范 `host` facet**。`client` / `worker` 是保留名，其契约归 [RFC 0002](../rfcs/0002-runtime-presentation.md)；在 RFC 0002 被接受前，这两个名字**没有任何已定义的语义**。
- manifest 中 `facets` 字段的声明语法由 [spec/manifest.md](manifest.md) 定义；激活与停用的状态机由 [spec/lifecycle.md](lifecycle.md) 定义。本文都不重复。

## 2. 规范性定义

### 2.1 四级对象模型

```text
Component（分发包：一个 dsh-plugin.json 对应一个）
  └── Facet（分面：插件在某个执行位置的分身，如 host）
        └── Activation（一次激活：生命周期与清理的作用域）
              └── Participant（参与者：代表这次激活与 Broker 协商的实体）
```

用人话过一遍这四级：

- **Component** 是你下载的那个安装包——分发与静态分析的单位。一个 Component 恰好拥有一份 `dsh-plugin.json`（[spec/manifest.md](manifest.md)）。
- **Facet** 是插件派驻到某个执行位置的分身。host 分身跑在宿主侧管逻辑；将来 client 分身贴着界面管呈现、worker 分身在后台干重活。v0.15 定义的合法 facet 名只有 `host`。
- **Activation** 是某个分身的一次"上岗"。生命周期顺序、资源归属、清理义务都以它为作用域（[spec/lifecycle.md](lifecycle.md)）——上岗期间创建的所有东西都记在这次上岗名下，下岗时统一回收。同一 facet 可以被重复激活（HMR、profile 重组），每次激活相互独立。
- **Participant** 是上岗时去和 Broker 谈判的代表——"我需要这些契约，请核对"。每个 Activation 必须恰好对应一个 Participant，由它携带 manifest 中的 `requires` 声明完成协商（协商规则见 [spec/negotiation.md](negotiation.md)）。

### 2.2 `host` facet 契约

`host` facet 在宿主侧的 Node.js 环境执行，承载插件的逻辑面。每个 facet 声明除 `entry` 外还必须携带 `apiVersion`（该 facet 要求的 Host API 版本；字段定义见 [spec/manifest.md §3.5](manifest.md)，协商时的匹配规则见 [spec/negotiation.md §2.3](negotiation.md)）。三条硬规则：

1. **entry 必须在家里。** `host` facet 的入口**必须**通过 manifest 的 `facets.host.entry` 声明，且路径必须位于包根目录之内——不允许指向包外的任意文件。
2. **entry 必须长成标准样子。** entry 模块**必须**以默认导出的形式给出一个由 `defineFacet` 创建的 facet 定义——即 `export default defineFacet(activation => ...)`。宿主加载 entry 时不做模块顶层副作用之外的任何假设：facet 的正式启动只发生在宿主调用该定义时。entry 的具体模块格式（ESM/CJS）与加载边界在 v0.15 仍是开放问题（见 [rfcs/0001-core-contract.md](../rfcs/0001-core-contract.md) §9），实现方以宿主 Host Descriptor 公示的 `execution.environment` 为准（[spec/host-descriptor.md](host-descriptor.md)）。
3. **只走前门。** `host` facet **必须**只依赖标准 facet 上下文（`defineFacet` 注入的对象），不得 import 宿主私有 API、Adapter 内部模块或 dsh/Cordis 包——那些正是"上游一更新就批量炸"的老路。需要诚实说明的边界：v0.15 的执行档位为 trusted-in-process，这是**受支持边界的声明，不是安全沙箱**——插件技术上能绕过去，绕过去的行为不受标准保护（[rfcs/0001-core-contract.md](../rfcs/0001-core-contract.md) 原则 ④）。

### 2.3 `defineFacet` 上下文的最小 API 面

`defineFacet` 的回调收到一个 activation 上下文对象。v0.15 只规范以下三个面——这个"只"字是双向承诺：宿主不多给，插件不多要：

| API | 语义 |
| --- | --- |
| `activation.extensions.publish(contract, id, handler)` | 按契约坐标（`apiVersion + kind`，如 `{ apiVersion: 'commands.dsh/v1alpha1', kind: 'Command' }`）向 Broker 发布一个实现。坐标**必须**是 [registry/](../registry/README.md) 中存在的精确条目，且插件已在 manifest 中声明对应依赖——没声明就用，协商报告会抓出来。 |
| `activation.scope.add(dispose)` | 注册一个清理函数，归本次 Activation 所有；deactivate 时由宿主调用。清理**必须**可重复执行，且不得假定一定会被调用到——崩溃时不保证送达（见 [spec/lifecycle.md](lifecycle.md) §2.3）。 |
| 协商后的能力注入 | 上下文中只暴露协商通过的契约对应的 API：required 缺失时插件根本不会被激活；optional 缺失时对应 API **不存在**（不是存在但报错），插件必须走显式降级路径（判定规则见 [spec/negotiation.md](negotiation.md)）。 |

除此之外：宿主不得通过该上下文暴露任何未在 registry 登记的私有能力；插件也不得假定上下文上存在本表之外的方法。

## 3. 示例

最小 `host` facet（与 [spec/manifest.md](manifest.md) 的 manifest 示例配套）：

```ts
export default defineFacet(activation => {
  activation.extensions.publish(
    { apiVersion: 'commands.dsh/v1alpha1', kind: 'Command' },
    'codex', commandHandler)
  activation.scope.add(() => commandHandler.dispose())
})
```

三行代码浓缩了整个模型：插件只依赖标准 facet 上下文，通过契约扩展点发布能力，生命周期由作用域自动回收——不碰宿主私有 API，不被特定运行时绑死。

参考示例：[dsh-codex 重构分支（`agent/std-facet-runtime`）](https://github.com/Yan-Zero/dsh-codex/tree/agent/std-facet-runtime)是一个真实插件按本模型改造的探索样本，验证了"同一插件经协议扩展点发布多种契约"的可行性。注意按原则 ⑧：它是参考实现，不是标准本身；与 spec 冲突时以 spec 为准。

## 4. 错误与边界情况

| 情况 | 规定行为 |
| --- | --- |
| entry 文件缺失或路径越出包根 | validate 阶段失败，插件不进入 activate（fixture 归 [spec/manifest.md](manifest.md)） |
| 默认导出不是 facet 定义（未经过 `defineFacet`、或没有默认导出） | validate 阶段失败，宿主必须给出人话报错 |
| 清理函数抛异常 | 宿主必须捕获并记为 `cleanup-failed`，不得中断其他插件的停用（effect ledger 规则见 [spec/lifecycle.md](lifecycle.md)） |
| 重复激活（HMR / profile 重组） | 是一次全新的 Activation；上次注册的资源必须先由上次 Activation 的 scope 清理（见 [spec/lifecycle.md](lifecycle.md)） |
| 声明 `client` / `worker` facet | v0.15 没有可激活的语义；schema 是否拒收由 [spec/manifest.md](manifest.md) 规定。插件不得假定这两个名字有任何行为 |
| trusted-in-process 边界 | 插件技术上可以绕过上下文直接调系统接口；本文的所有"不得"是受支持契约，不是安全强制（[rfcs/0001-core-contract.md](../rfcs/0001-core-contract.md) 原则 ④） |

## 5. fixtures 清单

本 spec 的"必须"条款对应以下 fixtures / 测试（均为规划路径，随对应 spec 与 Phase 2 产出）：

| 条款 | 抓住它的 fixture / 测试 |
| --- | --- |
| entry 必须位于包根内 | `conformance/fixtures/manifest/invalid/entry-outside-root.json` |
| entry 必须默认导出 facet 定义 | `conformance/fixtures/facet/invalid/not-a-facet/` |
| 只依赖标准 facet 上下文 | `conformance/fixtures/facet/invalid/private-import/`（package inspection 类检查） |
| publish 的坐标必须在 registry 且已声明 | `conformance/fixtures/negotiation/`（未声明即使用的用例） |
| 上下文不含未登记私有能力 | `conformance/suites/` 上下文面检查（Phase 2 产出） |

## 6. 变更记录

| 日期 | 变更 |
| --- | --- |
| 2026-08-18 | 初稿：四级模型定义；v0.15 收窄为只规范 `host` facet；`defineFacet` 最小 API 面（来源：issue #24 评论 4，处置见 [decisions/round-2-issue-24.md](../decisions/round-2-issue-24.md)） |
