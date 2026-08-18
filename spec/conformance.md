# Spec: 一致性（Conformance）

> **状态：Draft v0.15（社区讨论稿，非官方标准）**

这份文件管什么：定义"符合标准"到底拿什么证明——四类证据各是什么、各自允许怎么对外表述、以及每条证据必须绑定哪些测试环境记录。谁该读：宿主维护者（想声称"兼容"前）、插件作者（想给插件贴"通过校验"前）、市场与分发渠道（展示兼容状态前）。

## 1. 适用范围

- 本文件定义证据分类与**表述边界**，不定义测试本身——测试用例由 [conformance/fixtures/](../conformance/fixtures/README.md) 与 [conformance/suites/](../conformance/suites/README.md) 承载。
- 市场五态（声明兼容 / 等待授权 / 已实测 / 不兼容 / 未知）的定义及"不得互相升级"规则由 [spec/host-descriptor.md](host-descriptor.md) 规定，本文件不重复。
- 证据的完整分级体系（declared / resolved / decided / observed / tested / attested）归 [RFC 0004](../rfcs/0004-provenance-diagnostics.md)；本文件只定义 v0.15 可执行的最小子集。

## 2. 规范性定义

### 2.1 四类证据

v0.15 把"符合标准"的证据分成四类，各自独立成立、互不替代：

| # | 证据 | 是什么 | 怎么获得 |
| --- | --- | --- | --- |
| 1 | **Schema validation** | manifest / Host Descriptor 是合法文件 | 通过对应 JSON Schema 校验（`schemas/` 目录）+ 通过 `conformance/fixtures/` 下对应合法/非法用例 |
| 2 | **Host conformance** | 宿主的行为符合标准 | 宿主跑通 [conformance/suites/](../conformance/suites/README.md) 的 headless 套件：required/optional 协商、未知版本、授权拒绝、激活顺序、best-effort 关闭、标准回调异常捕获、重复激活、清理与 effect ownership |
| 3 | **Plugin validation** | 插件的声明与实现一致 | 插件通过校验：manifest 与 entrypoint 一致、只使用已声明的契约、contribution 声明/绑定一致且 ID 无冲突、optional 有降级路径、重复激活后资源可释放、错误信息可理解 |
| 4 | **Interop evidence** | 不同实现之间真的能互操作 | 至少**两个独立宿主产品/集成**与**三个示例插件**跑通同一组 headless 场景 |

对 Interop evidence 的两条硬性约束：

- 两个宿主**可以**共享同一个版本化 DSH Adapter，但各自的 integration 与 Host Descriptor 证据**必须**独立（违反该约束的互操作声明无效——由一致性套件的证据清单检查抓住，[conformance/suites/](../conformance/suites/README.md)，Phase 2 产出）。
- 任何实现**不能自我认证**：主动认领实现不等于通过，证据必须由套件运行结果支撑（来源：issue #23 处置，见 [decisions/round-1-issue-23.md](../decisions/round-1-issue-23.md)）。

Interop evidence 是 v0.15 从 Draft 晋级的验收标准；dsh-TUI 已认领首个 Host conformance（[decisions/round-2-issue-24.md](../decisions/round-2-issue-24.md)）。

### 2.2 表述边界：能说什么，不能说什么

通过任何一类证据后，对外表述**必须**精确绑定证据类别与标准版本：

- 宿主只能说："**该宿主通过 v0.15 Host conformance**"。
- 插件只能说："**该插件通过 v0.15 plugin validation**"。

以下表述**一律禁止**（违反属于表述违规，由治理流程处置，见 [rfcs/0000-governance.md](../rfcs/0000-governance.md)）：

- **"安全插件" / "安全宿主"**：trusted-in-process 档位下能力声明不构成安全边界，静态校验更不是代码安全审核（[rfcs/0001-core-contract.md](../rfcs/0001-core-contract.md) 原则 ④）。
- **"官方认证" / "dsh 官方兼容"**：本标准是社区讨论稿，不代表 dsh 官方立场。
- 把低级别证据表述成高级别证据（如把"声明兼容"说成"已实测"）——市场五态不得互相升级（[spec/host-descriptor.md](host-descriptor.md)）。

### 2.3 测试环境记录要求

任何"已实测"或"通过 conformance"的声明，**必须**绑定一份机器可读的测试环境记录，至少包含（缺失任一字段的记录无效——由一致性套件的记录格式校验抓住，[conformance/suites/](../conformance/suites/README.md)，Phase 2 产出）：

| 字段 | 内容 |
| --- | --- |
| 标准版本 | 如 `v0.15`，含所用 schema 版本 |
| 宿主 | Host ID（descriptor 中的 `id`）、版本、平台与架构 |
| 插件 | 插件 ID 与版本（interop 证据为全部参与插件） |
| 套件 | 一致性测试套件版本与 commit |
| 时间 | 测试执行时间 |
| 结果 | 通过 / 失败及失败项 |

## 3. 示例

一条测试环境记录（字段名为示意，以套件实现定案为准）：

```json
{
  "standard": { "version": "0.15", "schemaVersion": "0.15" },
  "host": { "id": "org.example.dsh-tui", "version": "1.4.0", "platform": "darwin-arm64" },
  "plugins": [
    { "id": "com.example.message-memory", "version": "1.2.0" }
  ],
  "suite": { "version": "0.15.0", "commit": "<套件 commit hash>" },
  "runAt": "2026-08-18T00:00:00Z",
  "result": "pass"
}
```

合规表述："dsh-TUI 1.4.0（darwin-arm64）通过 v0.15 Host conformance（套件 commit `<hash>`，2026-08-18）"。

违规表述："该插件是安全插件"、"官方认证兼容"、"市场收录即审核通过"。

## 4. 错误与边界情况

- **记录字段不全**：环境记录缺宿主平台、套件 commit 等任一必填字段时，该证据视为无效，声明方必须降级为更低级别表述（如退回"声明兼容"）。
- **环境漂移后复用旧证据**：宿主或插件版本变化后，旧记录不能自动继承；组合包可以锁定"标准版本 + 宿主版本 + 插件版本 + 套件"的完整组合复用结果（[rfcs/0001-core-contract.md](../rfcs/0001-core-contract.md) §8）。
- **共享 Adapter 的证据独立性**：两个宿主共享 Adapter 时，任一方的 descriptor 造假不影响另一方证据的有效性判定——各自独立举证。
- **fixtures 与套件尚未就位**：在 Phase 2 产出前，任何"通过 v0.15 Host conformance / plugin validation"的声明都不具备可验证依据，各方案前必须如实说明。

## 5. fixtures 清单

本 spec 的"必须"条款对应以下 fixtures / 测试（路径为规划约定）：

| 条款 | 抓住它的 fixture / 测试 |
| --- | --- |
| 互操作证据的宿主集成与 descriptor 必须独立 | `conformance/suites/` 证据清单检查 |
| 测试环境记录必须含全部必填字段 | `conformance/suites/` 记录格式校验 |
| Host conformance 覆盖的行为面 | `conformance/suites/`（协商 / 授权拒绝 / 激活顺序 / 异常 / 重复激活 / 清理） |
| 声明与实现一致（plugin validation） | `conformance/fixtures/manifest/` + `conformance/fixtures/facet/` |

## 6. 变更记录

| 日期 | 变更 |
| --- | --- |
| 2026-08-18 | 初稿：四类证据定义、表述边界、测试环境记录要求（来源：v0.15 §4.4 与 §8，issue #23/#24 处置记录） |
