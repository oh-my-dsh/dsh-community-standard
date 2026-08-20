# Spec: Facet API 参考（Facet API Reference）

> **状态：草案 v0（未表决，供社区讨论）**
> 本文是新增文档提案，目标位置 `spec/facet-api.md`。它把 [facet-model.md](facet-model.md) §2.3 的"最小 API 面"从三行描述展开成逐条签名定义——SDK 与宿主照此实现，插件作者照此编码。
> 标注 **【决策点 N】** 的地方是本文刻意留给社区表决的分叉；除决策点外的形状是起草者的 strawman 提议，同样欢迎推翻。
> 按原则 ⑧：任何参考实现（含 fabric 的 `.d.ts`）与本文冲突时，以本文定稿版为准；本文定稿前，实现方不得把任何签名当作稳定契约传播。

## 0. 这份文档和其他文档的关系

| 文档 | 回答的问题 |
| --- | --- |
| guides/plugin-author.md | 怎么从零写出第一个插件（教程） |
| spec/facet-model.md | 对象模型是什么、为什么这样设计（概念与规则） |
| **本文** | **每个 API 的精确签名、参数、返回值、错误、版本**（逐条参考） |
| registry/ 各条目 | 每条契约的领域语义与敏感级别 |

词条模板（每个 API 按此格式写）：**签名 → 参数 → 返回值 → 错误 → 生命周期约束 → 示例 → 对应 fixture → 自哪个版本起**。

## 1. 总体设计：统一窗口

本文采用的设计：**所有协商后的能力，都通过同一个方法领取。**

```ts
const storage = activation.contracts.get({ apiVersion: 'storage.dsh/v1alpha1', kind: 'LocalStorage' })
const last = await storage.get('lastMessageId')
```

`contracts.get(坐标)` 返回**契约句柄（contract handle）**；句柄上的领域 API（get/set、observe……）由对应的 registry 条目定义，上下文本身不认识任何领域。这就像自动售货机：输入编号，取出对应的商品，上架新商品不需要改造机器。写过 Vue 的话，它就是 `inject(key)` 的感觉。

选择这个设计，是为了排除另一种自然但有隐患的写法——把每个能力做成上下文的具名属性：

```ts
const last = await activation.storage.get('lastMessageId')   // 具名属性式
```

具名属性写起来顺手，但每接受一条新契约（settings、model provider……），`activation` 的类型定义就要新增一个属性，SDK 就要发一个新版本，全生态跟着升级。这正是元协议要消灭的"中心化 SDK 发版瓶颈"，不能让它换个地方复活。统一窗口则相反：新增契约时，上下文与 SDK 内核零改动，领域知识全部留在 registry 条目里（原则 ⑦）。

三点补充说明：

- 这个设计同时消除了现有文档的一处冲突：facet-model 规定上下文"只暴露三个面"，而 registry 条目示例使用了 `activation.storage` 这样的表外方法。定稿后，"三个面"落实为 `extensions` / `scope` / `contracts`，registry 示例随之修订。
- **顺手的写法仍然保留**：SDK 可以把 `activation.storage` 作为便利糖提供，底层仍然调用统一窗口。但它属于 SDK 便利层，不是标准契约——宿主一致性测试只测统一窗口。
- **【决策点 1】** 本文已按统一窗口起草全部签名。若有人主张把具名属性写进标准本身，需要先回答：每新增一条契约，是否接受全生态随 SDK 发版升级一次？如评审期内无成立的异议，本设计随文档定稿。

## 2. `defineFacet(setup)`

```ts
function defineFacet(
  setup: (activation: FacetActivation) => void | FacetHandle | Promise<void | FacetHandle>
): FacetDefinition
```

- **参数** `setup`：activation 进入 `activating` 阶段时，由宿主恰好调用一次。可以是 async 函数。
- **返回值** `FacetDefinition`：不透明对象，必须作为 entry 模块的默认导出（规则见 [facet-model.md](facet-model.md) §2.2）。`setup` 可选返回 `FacetHandle`（v0.15 为空接口，保留位）。
- **错误**：`setup` 抛异常或超时 → 本次 activation 直接进入 `disposed`，ledger 记失败，不影响其他插件（见 [lifecycle.md](lifecycle.md) §2.1）。
- **【决策点 2】** `setup` 超时：A. 标准规定统一默认值（提议 10s）宿主可配置；B. 完全由宿主决定并在 Host Descriptor 公示。起草者倾向 B——不同宿主的启动预算差异太大，但必须公示，插件才能有预期。
- **生命周期约束**：`setup` 内的注册全部归本次 activation 所有；模块顶层不得有业务副作用（重复激活语义见 [lifecycle.md](lifecycle.md) §2.4）。

## 3. `activation.extensions.publish(coordinate, id, implementation)`

```ts
publish<T extends ContractKind>(
  coordinate: ContractCoordinate,   // { apiVersion: string; kind: string }
  id: string,
  implementation: ImplementationOf<T>
): Disposable                        // { dispose(): void }
```

- **参数**：`coordinate` 必须是 registry 精确条目且已在 manifest `requires.contracts` 声明；`id` 对 Command 类契约必须等于 `contributes` 中已声明的 id；`implementation` 的类型由契约条目定义（§6）。
- **返回值**：`Disposable`。调用 `dispose()` 撤回本次发布；activation 结束时未撤回的发布由宿主统一释放并记入 ledger。
- **错误**（错误码见 §7）：坐标未声明 → `E_CONTRACT_NOT_DECLARED`；id 未在 contributes 声明（Command 类）→ `E_CONTRIBUTION_NOT_DECLARED`；同一 activation 内重复发布同一 (coordinate, id) → `E_DUPLICATE_PUBLISH`；在 `active` / `activating` 之外调用 → `E_WRONG_STATE`。
- **【决策点 3】** 重复发布语义：A. 抛 `E_DUPLICATE_PUBLISH`（提议）；B. 后者替换前者并记 ledger `replace`。起草者倾向 A——replace 语义与 RFC 0003 的 Provider 替换重叠，v0.15 不抢跑。

## 4. `activation.scope.add(dispose)`

```ts
add(dispose: () => void | Promise<void>): void
```

- **语义**：注册清理函数，deactivate 时由宿主调用。**调用顺序为 LIFO**（后注册先清理），与资源依赖的常见方向一致。
- **约束**：清理函数必须可重复执行；可能被调用零次（崩溃）、一次或多次（见 [lifecycle.md](lifecycle.md) §2.3）。抛异常 → 宿主捕获、记 `cleanup-failed`、继续执行其余清理。
- **【决策点 4】** 单个清理函数的时间边界：提议宿主统一 5s 上限、超时记 `cleanup-failed`；数值待表决。

## 5. `activation.contracts.get(coordinate)`

```ts
get<T extends ContractKind>(coordinate: ContractCoordinate): HandleOf<T>
```

- **语义**：获取协商通过的契约句柄。required 契约的句柄保证存在（协商没过根本不会激活）；optional 契约缺失时**本方法抛 `E_CONTRACT_UNAVAILABLE`**，配套 `activation.contracts.has(coordinate): boolean` 供降级路径判断。
- **【决策点 5】** optional 缺失时 `get` 的行为：A. 抛错 + `has()` 判断（提议——显式降级，与 [negotiation.md](negotiation.md)"optional 缺失时对应 API 不存在"一致）；B. 返回 `undefined`（类型上到处都要判空）。
- **错误**：坐标未在 manifest 声明 → `E_CONTRACT_NOT_DECLARED`（即使宿主支持也抛——只能用声明过的，这是声明与实现一致性的运行时执行点）。

## 6. v0.15 三条契约的句柄接口

以下接口由各 registry 条目所有，列在此处便于查阅；冲突时以 registry 条目定稿为准。

### 6.1 `LocalStorage`（storage.dsh/v1alpha1）

```ts
interface LocalStorageHandle {
  get(key: string): Promise<JsonValue | undefined>
  set(key: string, value: JsonValue): Promise<void>
  delete(key: string): Promise<void>
  keys(): Promise<string[]>
}
```

- 按 Component 隔离；值为可 JSON 序列化数据。
- **【决策点 6】** 值类型：A. `JsonValue`（提议——省去每个插件自己 stringify）；B. 仅 `string`。
- **【决策点 7】** 配额：提议单 Component 默认 5 MB、单值 512 KB，超限抛 `E_STORAGE_QUOTA`；数值待表决。写入内容永不进 ledger。

### 6.2 `Command`（commands.dsh/v1alpha1）

```ts
type CommandHandler = (invocation: {
  commandId: string
  correlationId: string
}) => void | Promise<void>
```

- flat action leaf：不收参数负载、不返回展示内容——参数与富返回依赖 RFC 0002 的 presentation 分层，v0.15 刻意不开口（见 registry 条目"明确不包含什么"）。
- handler 抛异常 → 宿主捕获、按 `correlationId` 记稳定错误、向用户显示人话失败提示；不得让异常逃逸到宿主主流程。
- **【决策点 8】** handler 超时：提议默认 30s、宿主可配置并公示；超时视同异常。

### 6.3 `MessageObserver`（messages.dsh/v1alpha1）

```ts
interface MessageObserverHandle {
  observe(callback: (envelope: MessageEnvelope) => void): Disposable
}
```

- `envelope` 为 [event-envelope.md](event-envelope.md) 定义的只读信封；payload 类型在 ContentBlock 边界冻结前标注 `unknown`，SDK 不得提前给出具体字段类型。
- callback 同步执行、必须快速返回；重活自行异步调度。callback 抛异常 → 隔离本 observer，不影响主流程与其他 observer（见 [event-envelope.md](event-envelope.md) §2.4）。
- **【决策点 9】** 背压：提议每 observer 有界队列（默认 256 条），溢出丢弃最旧并记 ledger 一次性告警；策略待表决。
- 返回的 `Disposable` 应挂到 `activation.scope.add`。

## 7. 错误模型

所有标准 API 抛出的错误**必须**是 `StandardError`：

```ts
interface StandardError extends Error {
  code: ErrorCode        // 稳定错误码，见下表
  contract?: ContractCoordinate
  detail?: JsonValue     // 不含敏感数据
}
```

| code | 触发 |
| --- | --- |
| `E_CONTRACT_NOT_DECLARED` | 使用了 manifest 未声明的契约 |
| `E_CONTRACT_UNAVAILABLE` | optional 契约缺失时调用 `get` |
| `E_CONTRIBUTION_NOT_DECLARED` | 绑定了 contributes 未声明的 id |
| `E_DUPLICATE_PUBLISH` | 同 (coordinate, id) 重复发布 |
| `E_WRONG_STATE` | 在非法生命周期阶段调用 |
| `E_STORAGE_QUOTA` | 存储超限 |
| `E_TIMEOUT` | setup / handler / 清理超时 |

错误码进入 ledger 的 `errorCode` 字段；错误码集合随本文版本演进，宿主不得发明未登记错误码。

## 8. 对应 fixtures 清单（规划）

| 条款 | fixture（约定路径） |
| --- | --- |
| 未声明契约即 publish / get | `conformance/fixtures/facet-api/undeclared-contract/` |
| 重复发布 | `conformance/fixtures/facet-api/duplicate-publish/` |
| optional 缺失走 `has()` 降级 | `conformance/fixtures/facet-api/optional-degrade/` |
| scope LIFO 与可重复清理 | `conformance/fixtures/facet-api/scope-order/` |
| observer 只读信封 / 异常隔离 | 复用 `conformance/fixtures/events/` 既有用例 |
| 错误对象携带稳定 code | `conformance/fixtures/facet-api/error-codes/` |

## 9. 定稿路径（提议）

1. 本文以草案挂到讨论区，9 个决策点开一个 checklist issue 逐项表决（建议每项 72h lazy consensus）。
2. fabric 按表决结果出 `.d.ts` + 原型，跑通三个示例插件。
3. 原型发现的签名问题回灌本文（改文档，不是只改代码），随后 schema / fixtures 落地，本文并入 v0.16 冻结。

同时需要一并修订的既有文档：facet-model §2.3（第三面改为 `contracts`）、registry 三条目的用法示例（改为经前门获取句柄，具名糖标注"SDK 便利层，非标准"）。
