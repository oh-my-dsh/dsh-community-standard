# Spec: 元协议协商内核（Negotiation）

> **状态：Draft v0.15（社区讨论稿，非官方标准）**
> 产出物：[`schemas/negotiation-report.schema.json`](../schemas/negotiation-report.schema.json)
> 读者提示：这份 spec 一半写给实现协商器的宿主开发者，一半写给在 CI 里消费协商报告的工具作者。[§4](#4-三种结局的完整示例) 给全三种结局的完整示例。每条"必须"对应的测试样本统一列在 [§5](#5-错误与边界情况) 和 [§6](#6-对应-fixtures-清单)。

"协商"回答的是这样一个问题：手里有一份插件 manifest 和一份宿主自述（Host Descriptor），**不运行任何插件代码**，能不能算出"能装吗、能跑吗、要不要先问用户"？

答案是能，而且必须能——这就是协商内核。它是一个纯函数：同样的输入永远给同样的答案，没有网络、没有时钟、没有随机数，你可以在 CI 里跑一万次，结果逐字节相同。这个性质不是洁癖，它意味着市场、启动器、CI 和宿主看到的兼容性判断**永远一致**，不存在"我这儿能装你那儿装不上"的玄学。

## 1. 适用范围

本文规定协商纯函数的签名、匹配规则、三种判定和报告格式。以下内容不在本文：

- manifest 各字段语义 → [manifest.md](manifest.md)
- Host Descriptor 各字段语义、市场五态 → [host-descriptor.md](host-descriptor.md)
- 契约坐标规则与 registry 条目 → [VERSIONING.md](../VERSIONING.md)、[registry/](../registry/README.md)
- 协商在整个激活流程中的位置（`negotiate` 阶段）→ [lifecycle.md](lifecycle.md)

## 2. 规范性定义

### 2.1 函数签名与纯度

```text
negotiate(manifest, hostDescriptor, registrySnapshot) → report
```

协商**必须**是纯函数：

- 无 I/O、无网络访问、不读时钟与随机源。相同输入**必须**产生相同报告。
- 不得 import dsh / Cordis / 任何宿主产品代码——CI 里不装 dsh 也必须能跑。
- `registrySnapshot` 是 [registry/](../registry/README.md) 条目的冻结快照，作为输入传入（v0.15 即三条标准条目）。协商器不得自行从规范正文发明条目。

内核只做三件事：解析参与者声明、解析 `apiVersion + kind` 契约引用、做 requires/supports 匹配。它不认识 storage、commands、messages——具体领域的语义全在各契约条目里，这正是"元协议"的意思：内核只认门牌号格式，不管门里住着谁。

### 2.2 前置条件

进入协商前，manifest 与 Host Descriptor **必须**已分别通过各自的 schema 校验（即生命周期 `validate` 阶段已通过，见 [lifecycle.md](lifecycle.md)）。协商器对非法输入的行为不作规定——工具应当在调用协商前先校验，垃圾进垃圾出不是协商器的责任范围。

### 2.3 匹配规则

按顺序执行三类检查：

1. **Facet 检查**：对 manifest `facets` 中每个 facet，其 `apiVersion` **必须**出现在 Descriptor `apiVersions[facet]` 数组中。不满足的记入 `unsupportedFacets`。
2. **契约检查**：对 `requires.contracts` 每项，在 Descriptor `capabilities` 中找 `apiVersion` 与 `kind` **双双精确相等**的条目。没有模糊匹配、没有"差不多兼容"。required 契约无匹配 → 记入 `missingRequired`；optional 契约无匹配 → 记入 `degradedOptional`。
3. **敏感检查**：对所有**匹配成功**的声明（含 `subscriptions` 引用的事件），查 registry 快照的敏感级别；标记为需授权的记入 `awaitingAuthorization`。注意 optional 且缺失的声明不进入此项——缺失即降级，人都不在，不需要授权。

### 2.4 判定规则

三种结局，不多不少：

| verdict | 条件 | 含义 |
| --- | --- | --- |
| `rejected` | `missingRequired` 或 `unsupportedFacets` 非空 | 拒载：安装/激活之前明确拒绝 |
| `pending-authorization` | 无拒绝项，且 `awaitingAuthorization` 非空 | 宿主支持，但需用户或策略授权后才能激活 |
| `compatible` | 以上都不是 | 静态协商通过（`degradedOptional` 可能非空） |

三条补充规则：

- **拒载必须说人话。** required 缺失时，报告**必须**携带用户能看懂的原因：插件需要什么、当前环境缺什么。示例样式："该插件需要图形界面能力，当前终端不支持"。只输出坐标串、没有人话解释的报告不合规——被拒载的是用户，不是解析器。
- **optional 缺失是降级，不是失败。** verdict 仍为 `compatible`，缺失项列入 `degradedOptional`，插件按声明过的降级路径运行（语义见 [manifest.md §3.7](manifest.md)）。
- **待授权不是拒绝。** `pending-authorization` 的意思是"授权即可用"。授权流程本身（什么时候问用户、答案记在哪）是宿主 `authorize` 阶段的职责（见 [lifecycle.md](lifecycle.md)），不属于这个纯函数——纯函数不弹对话框。

报告到市场五态的映射规则（声明兼容 / 等待授权 / 已实测 / 不兼容 / 未知，且不得互相升级）见 [host-descriptor.md §3](host-descriptor.md)，本文不复述。

### 2.5 协商报告格式

报告是单个 JSON 对象，schema 见 [`schemas/negotiation-report.schema.json`](../schemas/negotiation-report.schema.json)：

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `reportVersion` | string | **是** | 报告格式版本，v0.15 必须等于 `"0.15"` |
| `verdict` | string | **是** | `compatible` / `rejected` / `pending-authorization` 之一 |
| `message` | string | **是** | 人话结论；`rejected` 时必须含 §2.4 要求的可读原因 |
| `missingRequired` | array | 否 | 缺失的 required 契约坐标（`{ apiVersion, kind }`） |
| `degradedOptional` | array | 否 | 缺失的 optional 契约坐标（降级项） |
| `awaitingAuthorization` | array | 否 | 待授权的敏感声明坐标 |
| `unsupportedFacets` | array | 否 | facet API 版本不匹配项（`{ facet, requiredApiVersion, supportedApiVersions }`） |

宿主、市场、启动器、CI **必须**消费同一份报告格式。社区此前独立存在的插件校验报告（qing3a / dsh-plugin-verify 的格式诉求）已并入本格式，不再单独存在（背景见 [decisions/round-1](../decisions/round-1-issue-23.md)）。

## 3. 示例输入

以下示例共用同一份 Descriptor（坐标为示意，以 Registry 定案为准）：

```json
{
  "descriptorVersion": "0.15",
  "id": "org.example.dsh-tui",
  "apiVersions": { "host": ["v1alpha1"] },
  "execution": { "environment": "node", "trustMode": "trusted-in-process" },
  "capabilities": [
    { "apiVersion": "commands.dsh/v1alpha1", "kind": "Command" },
    { "apiVersion": "storage.dsh/v1alpha1", "kind": "LocalStorage" }
  ]
}
```

## 4. 三种结局的完整示例

### 4.1 兼容（`compatible`）

manifest 声明 required `storage.dsh/v1alpha1` + optional `messages.dsh/v1alpha1`。storage 匹配成功；messages 未匹配但为 optional → 降级。

```json
{
  "reportVersion": "0.15",
  "verdict": "compatible",
  "message": "静态协商通过；可选的消息观察能力不可用，插件将按声明的降级路径运行。",
  "degradedOptional": [
    { "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver" }
  ]
}
```

### 4.2 拒载（`rejected`）

manifest 声明 required `x-org.example.gui.panel/v1alpha1`（kind: Panel），Descriptor 未提供该坐标。

```json
{
  "reportVersion": "0.15",
  "verdict": "rejected",
  "message": "该插件需要图形面板能力（x-org.example.gui.panel），当前终端宿主不支持，无法安装。",
  "missingRequired": [
    { "apiVersion": "x-org.example.gui.panel/v1alpha1", "kind": "Panel" }
  ]
}
```

### 4.3 待授权（`pending-authorization`）

manifest 声明 required `messages.dsh/v1alpha1`（kind: MessageObserver），Descriptor 支持该坐标，但 registry 条目标记其为敏感（sensitivity: high，见 [registry/events/messages.dsh-v1alpha1.md](../registry/events/messages.dsh-v1alpha1.md)）。

```json
{
  "reportVersion": "0.15",
  "verdict": "pending-authorization",
  "message": "宿主支持该插件，但它需要观察消息内容，等待用户授权后才能激活。",
  "awaitingAuthorization": [
    { "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver" }
  ]
}
```

## 5. 错误与边界情况

| 情况 | 规定行为 | 抓住它的 fixture / 测试 |
| --- | --- | --- |
| manifest / Descriptor 未过 schema 校验 | 不进入协商（validate 阶段已拒） | manifest 与 host-descriptor 的 invalid fixtures |
| required 契约无匹配 | verdict `rejected`，人话说明缺什么 | `negotiation/rejected-missing-required/` |
| facet `apiVersion` 不在宿主支持列表 | verdict `rejected`，记入 `unsupportedFacets` | `negotiation/rejected-unsupported-facet/` |
| optional 契约无匹配 | verdict `compatible`，记入 `degradedOptional` | `negotiation/degraded-optional/` |
| 敏感声明匹配成功但未授权 | verdict `pending-authorization` | `negotiation/pending-authorization/` |
| 契约坐标不在 registry（含 `x-org.*` 私有坐标） | 不是错误：照常按坐标匹配；宿主未声明即不匹配 | `negotiation/rejected-missing-required/` |
| `requires.contracts` 为空且无敏感声明 | verdict `compatible` | `negotiation/compatible/` |
| 同一输入多次协商 | 必须产出逐字节相同的报告（纯度） | suites 确定性断言 |

## 6. 对应 fixtures 清单

fixtures 由后续任务创建。每个用例目录含 `manifest.json`、`host-descriptor.json`、`expected-report.json` 三个文件：

- `conformance/fixtures/negotiation/compatible/`
- `conformance/fixtures/negotiation/degraded-optional/`
- `conformance/fixtures/negotiation/rejected-missing-required/`
- `conformance/fixtures/negotiation/rejected-unsupported-facet/`
- `conformance/fixtures/negotiation/pending-authorization/`

## 7. 变更记录

| 版本 | 变更 |
| --- | --- |
| v0.15 | 首版成稿。协商内核重构为领域无关元协议（契约可拔插、独立版本化，本轮讨论处置见 [decisions/round-2](../decisions/round-2-issue-24.md)）；判定收敛为 compatible / rejected / pending-authorization 三种；机器可读报告格式定稿，社区校验报告诉求并入本格式。 |
