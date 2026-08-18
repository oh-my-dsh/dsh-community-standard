# Registry：契约注册表

> **状态：Draft v0.15（社区讨论稿，非官方标准）**

这份文件管什么：说明本目录（契约注册表）的条目怎么读、怎么写、怎么新增和变更。谁该读：所有实现方——**契约的名字和版本以这里的条目为唯一权威**，不许从 RFC 或 spec 正文里自行发明"等价"名称；以及想登记新契约的人。

## 1. 条目格式

每个契约条目 = **一个 JSON 文件**（机器可读，权威来源）+ **一个同名 `.md` 文件**（人话说明 + 用法示例）。两者同目录、同主名：

```text
capabilities/commands.dsh-v1alpha1.json   # 机器可读条目
capabilities/commands.dsh-v1alpha1.md     # 人话说明
```

capability 条目放 `capabilities/`，event 条目放 `events/`。文件主名 = 坐标中的 `apiVersion` 部分把 `/` 换成 `-`（如 `commands.dsh/v1alpha1` → `commands.dsh-v1alpha1`）。

### 1.1 JSON 字段

以 [`capabilities/commands.dsh-v1alpha1.json`](capabilities/commands.dsh-v1alpha1.json) 为实际样例，字段如下：

| 字段 | 含义 |
| --- | --- |
| `apiVersion` | 坐标的版本线部分，如 `commands.dsh/v1alpha1` |
| `kind` | 坐标的类别部分，如 `Command`。`apiVersion + kind` 合起来是契约坐标（规则见 [VERSIONING.md](../VERSIONING.md)） |
| `status` | 条目状态：`Draft` 等，取值与流转跟随 RFC 状态机（[rfcs/template.md](../rfcs/template.md)） |
| `owningSpec` | 定义该契约行为语义的 spec 文件（仓库内相对路径） |
| `owningRFC` | 决定该契约存在的 RFC（仓库内相对路径） |
| `schema.id` | 该契约输入/输出 schema 的 canonical identifier（当前为示意 URL，以本 Registry 定案为准） |
| `schema.hash` | schema 的不可变 hash；schema 冻结前为 `null`，冻结后必须填入且不得再变 |
| `sensitivity` | 敏感级别：`low` / `high`，用于授权与裁剪策略 |
| `lifecycleScope` | 契约注册的归属作用域：`activation`（归一次激活）或 `component`（归整个组件） |
| `deprecation` | 弃用信息；未弃用为 `null`，弃用时记录替代坐标与弃用窗口（窗口规则见 [VERSIONING.md](../VERSIONING.md)） |
| `$comment` | 给读者看的附注，无规范效力 |

条目中未列出的字段一律视为不存在——不要假定有未写明的扩展字段。

## 2. 坐标规则

- 契约坐标 = `apiVersion + kind`，如 `commands.dsh/v1alpha1` + `Command`。
- `v1alpha1` 的语义（实验期、可能 breaking、不伪装稳定 `1.x`）与 breaking change / 弃用窗口规则见 [VERSIONING.md](../VERSIONING.md)，本文件不重复。
- Host Descriptor 与 manifest 只能引用本 Registry 中存在的**精确条目**，不能用产品本地别名替代（宿主义务见 [rfcs/0001-core-contract.md](../rfcs/0001-core-contract.md)）。

## 3. 登记与变更流程

新增契约、修改条目、弃用与替代，一律走 RFC 流程：评审期、决策方式、命名登记与官方保留命名空间的管理由 [RFC 0000 治理文档](../rfcs/0000-governance.md) 定义。流程要点：先提 RFC（模板见 [rfcs/template.md](../rfcs/template.md)），Accepted 后条目随 schema 与 fixtures 一并落地——一个契约只有同时有 **spec 语义 + registry 条目 + schema + fixtures** 才算进入标准（原则 ⑧）。

## 4. 官方保留命名空间

`*.dsh` 坐标域（即 `apiVersion` 中以 `.dsh/` 结尾的所有坐标，含 `commands.dsh`、`storage.dsh`、`messages.dsh` 及该域下全部未来条目）为**官方保留命名空间**：本社区标准只占位管理，未来 dsh 官方能力可直接以一等身份入驻。社区成员不得在该域下自行登记新坐标；保留命名空间的接收与移交规则由 [RFC 0000](../rfcs/0000-governance.md) 管理。

## 5. `x-org.*` 私有扩展

组织内部的实验性契约使用组织命名空间，形如 `x-org.example.tui.keymap`（语法与冲突规则见 [VERSIONING.md](../VERSIONING.md)）。规则：

- `x-org.*` 契约**不进**本官方 Registry，也不得以任何方式伪装成标准条目；
- 建议按本目录相同的条目格式自行管理（JSON + 同名 `.md`），方便日后提案转正；
- 私有能力想进入标准，须按第 3 节另写 RFC，并由多个宿主证明语义可移植。

## 6. 当前条目

| 坐标 | kind | 类别 | 状态 |
| --- | --- | --- | --- |
| [`commands.dsh/v1alpha1`](capabilities/commands.dsh-v1alpha1.md) | `Command` | capability | Draft |
| [`storage.dsh/v1alpha1`](capabilities/storage.dsh-v1alpha1.md) | `LocalStorage` | capability | Draft |
| [`messages.dsh/v1alpha1`](events/messages.dsh-v1alpha1.md) | `MessageObserver` | event | Draft |

（坐标为示意，以本 Registry 定案为准。）

## 7. 变更记录

| 日期 | 变更 |
| --- | --- |
| 2026-08-18 | 初稿：条目格式（对齐现有 JSON 字段）、坐标规则、登记流程指向、官方保留命名空间与 `x-org.*` 规则 |
