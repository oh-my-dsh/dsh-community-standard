# Spec: Facet 对象模型（Facet Model）

> **状态：Draft v0.15（社区讨论稿，非官方标准）**

这份文件管什么：定义"一个插件在标准眼里长什么样"——Component → Facet → Activation → Participant 四级对象模型，以及 v0.15 唯一有完整契约的 `host` facet 的规范。谁该读：插件作者（写 `defineFacet` 前）、宿主维护者（实现加载与激活前）。

本模型来自社区 issue #24 中 Yan-Zero 的提案（处置记录见 [decisions/round-2-issue-24.md](../decisions/round-2-issue-24.md)）：调研的 12 个插件样本里 9 个同时需要宿主侧逻辑和客户端呈现——跨面是常态，不是特例，所以对象模型先把"分身"这件事说清楚。

## 1. 适用范围

- 本文件定义四级对象模型的术语与关系，以及 `host` facet 的完整契约（entry 位置、模块格式、执行环境）。
- v0.15 **只规范 `host` facet**。`client` / `worker` 是保留名，其契约归 [RFC 0002](../rfcs/0002-runtime-presentation.md)；在 RFC 0002 被接受前，这两个名字没有任何已定义的语义。
- manifest 中 `facets` 字段的声明语法（`facets.host.entry` 等）由 [spec/manifest.md](manifest.md) 定义，本文件不重复；激活与停用的状态机由 [spec/lifecycle.md](lifecycle.md) 定义，本文件不重复。

## 2. 规范性定义

### 2.1 四级对象模型

```text
Component（分发包：一个 dsh-plugin.json 对应一个）
  └── Facet（分面：插件在某个执行位置的分身，如 host）
        └── Activation（一次激活：生命周期与清理的作用域）
              └── Participant（参与者：代表这次激活与 Broker 协商的实体）
```

- **Component**：分发与静态分析的单位。一个 Component 恰好拥有一份 `dsh-plugin.json`（[spec/manifest.md](manifest.md)）。
- **Facet**：Component 内按执行位置划分的分身。v0.15 定义的合法 facet 名只有 `host`；`client` / `worker` 为保留名。
- **Activation**：某个 facet 的一次有界激活。生命周期顺序、资源归属、清理义务都以它为作用域（[spec/lifecycle.md](lifecycle.md)）。同一 facet 可以被重复激活（HMR、profile 重组），每次激活相互独立。
- **Participant**：协商的单位。每个 Activation 必须恰好对应一个 Participant，由它携带 manifest 中的 `requires` 声明与 Broker 完成协商（协商规则见 [spec/negotiation.md](negotiation.md)）。

### 2.2 `host` facet 契约

`host` facet 在宿主侧的 Node.js 环境执行，承载插件的逻辑面。每个 facet 声明除 `entry` 外还必须携带 `apiVersion`（该 facet 要求的 Host API 版本；定义见 [spec/manifest.md](manifest.md) §3.5，协商时的匹配规则见 [spec/negotiation.md](negotiation.md) §2.3）。

1. **entry 位置**：`host` facet 的入口**必须**通过 manifest 的 `facets.host.entry` 声明，且路径必须位于包根目录之内（声明语法与路径校验规则见 [spec/manifest.md](manifest.md)；违反会被 `conformance/fixtures/manifest/invalid/entry-outside-root.json` 抓住——fixture 路径为规划约定，随 spec/manifest.md 产出）。
2. **模块格式**：entry 模块**必须**以默认导出的形式给出一个由 `defineFacet` 创建的 facet 定义——即 `export default defineFacet(activation => ...)`。宿主加载 entry 时不得执行模块顶层副作用之外的任何假设：facet 的正式启动只发生在宿主调用该定义时。entry 的具体模块格式（ESM/CJS）与加载边界在 v0.15 仍为开放问题（见 [rfcs/0001-core-contract.md](../rfcs/0001-core-contract.md) §9），实现方必须以宿主 Host Descriptor 公示的 `execution.environment` 为准（[spec/host-descriptor.md](host-descriptor.md)）。
3. **执行环境**：`host` facet **必须**只依赖标准 facet 上下文（`defineFacet` 注入的对象），不得 import 宿主私有 API、Adapter 内部模块或 dsh/Cordis 包（违反会被 package inspection 类 fixture 抓住：`conformance/fixtures/facet/invalid/private-import/`，路径为规划约定）。v0.15 的执行档位为 trusted-in-process——这是受支持边界的声明，不是安全沙箱（见 [rfcs/0001-core-contract.md](../rfcs/0001-core-contract.md) 原则 ④）。

### 2.3 `defineFacet` 上下文的最小 API 面

`defineFacet` 的回调收到一个 activation 上下文对象，v0.15 只规范以下三个面：

| API | 语义 |
| --- | --- |
| `activation.extensions.publish(contract, id, handler)` | 按契约坐标（`apiVersion + kind`，如 `{ apiVersion: 'commands.dsh/v1alpha1', kind: 'Command' }`）向 Broker 发布一个实现。坐标**必须**是 [registry/](../registry/README.md) 中存在的精确条目，且插件已在 manifest 中声明对应依赖（违反会被协商报告抓住：`conformance/fixtures/negotiation/` 下未声明即使用的用例，路径为规划约定）。 |
| `activation.scope.add(dispose)` | 注册一个清理函数，归本次 Activation 所有；deactivate 时由宿主调用。清理**必须**设计成可重复执行，且不得假定一定会被调用到（崩溃时不保证送达，见 [spec/lifecycle.md](lifecycle.md)）。 |
| 协商后的能力注入 | 上下文中只暴露协商通过的契约对应的 API：required 缺失时插件不会被激活，optional 缺失时对应 API 不存在，插件必须走显式降级路径（判定规则见 [spec/negotiation.md](negotiation.md)）。 |

除此之外，宿主不得通过该上下文暴露任何未在 registry 登记的私有能力；插件也不得假定上下文上存在本表之外的方法（违反会被一致性套件中的上下文面检查抓住，见 [conformance/suites/](../conformance/suites/README.md)，Phase 2 产出）。

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

插件只依赖标准 facet 上下文：不碰宿主私有 API，不被特定运行时绑死，生命周期由作用域自动回收。

参考示例：[dsh-codex 重构分支（`agent/std-facet-runtime`）](https://github.com/Yan-Zero/dsh-codex/tree/agent/std-facet-runtime) 是一个真实插件按本模型改造的探索样本，验证了"同一插件经协议扩展点发布多种契约"的可行性。注意：按原则 ⑧，它是参考实现，不是标准本身；与 spec 冲突时以 spec 为准。

## 4. 错误与边界情况

- **entry 文件缺失或路径越出包根**：在 validate 阶段失败，插件不得进入 activate（fixture 归 [spec/manifest.md](manifest.md)）。
- **默认导出不是 facet 定义**（未经过 `defineFacet`、或没有默认导出）：validate 阶段失败，宿主必须给出人话报错（fixture：`conformance/fixtures/facet/invalid/not-a-facet/`，路径为规划约定）。
- **清理函数抛异常**：宿主必须捕获并记为 `cleanup-failed`，不得中断其他插件的停用（effect ledger 规则见 [spec/lifecycle.md](lifecycle.md)）。
- **重复激活**：同一 facet 因 HMR / profile 重组被再次激活时，是一次全新的 Activation——上次注册的资源必须先由上次 Activation 的 scope 清理（见 [spec/lifecycle.md](lifecycle.md)）。
- **声明 `client` / `worker` facet**：v0.15 没有可激活的语义；schema 是否拒收由 [spec/manifest.md](manifest.md) 规定。插件不得假定这两个名字有任何行为。
- **trusted-in-process 边界**：插件技术上可以绕过上下文直接调系统接口；本文件的所有"不得"是受支持契约，不是安全强制（[rfcs/0001-core-contract.md](../rfcs/0001-core-contract.md) 原则 ④）。

## 5. fixtures 清单

本 spec 的"必须"条款对应以下 fixtures / 测试（均为规划路径，随对应 spec 与 Phase 2 产出）：

| 条款 | 抓住它的 fixture / 测试 |
| --- | --- |
| entry 必须位于包根内 | `conformance/fixtures/manifest/invalid/entry-outside-root.json` |
| entry 必须默认导出 facet 定义 | `conformance/fixtures/facet/invalid/not-a-facet/` |
| 只依赖标准 facet 上下文 | `conformance/fixtures/facet/invalid/private-import/` |
| publish 的坐标必须在 registry 且已声明 | `conformance/fixtures/negotiation/`（未声明即用例） |
| 上下文不含未登记私有能力 | `conformance/suites/` 上下文面检查 |

## 6. 变更记录

| 日期 | 变更 |
| --- | --- |
| 2026-08-18 | 初稿：四级模型定义；v0.15 收窄为只规范 `host` facet；`defineFacet` 最小 API 面（来源：issue #24 评论 4，处置见 [decisions/round-2-issue-24.md](../decisions/round-2-issue-24.md)） |
