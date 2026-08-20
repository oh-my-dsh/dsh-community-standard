# Spec: Host Descriptor（宿主自述文件）

> **状态：Draft v0.15（社区讨论稿，非官方标准）**
> 产出物：[`schemas/host-descriptor.schema.json`](../schemas/host-descriptor.schema.json) + fixtures
> 每条"必须"对应的测试样本统一列在文末 [§5 错误表](#5-错误与边界情况) 和 [§6 fixtures 清单](#6-对应-fixtures-清单)，正文不再逐条标注。

Host Descriptor 是宿主的自述文件：每个兼容宿主（GUI / Web UI / TUI / 启动器）发布一份机器可读 JSON，诚实回答三个问题——**我是谁、我实际实现了哪些契约、我以什么信任档位运行插件**。宿主维护者写它，协商器、市场和 CI 消费它。

它是 manifest 的镜像：manifest 说"我需要什么"，Descriptor 说"我有什么"，协商器拿两份文件一对，兼容性判断就出来了——全程不运行一行插件代码。

这份文件的关键词是**诚实**。Descriptor 里每一条声明都会被用户当成承诺，所以规则的设计目标是：宁可少声明，不许吹牛。

## 1. 适用范围

本文规定 Host Descriptor 的逐字段语义与宿主的声明义务。以下内容不在本文：

- 用 Descriptor 与 manifest 做匹配判定的规则 → [negotiation.md](negotiation.md)
- 契约坐标与版本维度 → [VERSIONING.md](../VERSIONING.md)
- 契约条目的权威清单 → [registry/](../registry/README.md)
- 一致性测试与"已实测"证据的表述边界 → [conformance.md](conformance.md)

## 2. 规范性定义

### 2.1 字段总览

| 字段 | 类型 | 必填 | 含义 |
| --- | --- | --- | --- |
| `descriptorVersion` | string | **是** | Descriptor 结构版本，v0.15 必须等于 `"0.15"` |
| `id` | string | **是** | 稳定、带组织命名空间的宿主 ID（反向域名语法，规则同 [manifest §3.4](manifest.md)） |
| `execution` | object | **是** | 执行环境与信任档位（§2.3） |
| `capabilities` | array | **是** | 实际实现的契约精确条目（§2.4） |
| `apiVersions` | object | 否 | 各 facet 支持的 Host API 版本（§2.5） |
| `platforms` | array | 否 | 支持的平台标识（§2.6） |

### 2.2 `descriptorVersion`

**必须**存在且等于 `"0.15"`。

### 2.3 `execution`

必须包含两个字段：

| 字段 | v0.15 合法值 | 含义 |
| --- | --- | --- |
| `environment` | `"node"` | 插件 entrypoint 实际执行的运行时。v0.15 只规范 Node.js 宿主侧运行时 |
| `trustMode` | `"trusted-in-process"` | 信任档位。v0.15 唯一已定义的档位 |

出现其他值必须被拒绝。特别是：隔离执行档位（`isolated`）需要另行规定进程/realm 隔离、受控 IPC 等证据，归后续 RFC——在那之前，任何宿主不得声称该档位。合法值列表故意这么短，就是不给"自封安全"留字段。

**trusted-in-process 的公示义务（必须）**：这个档位的意思是插件与宿主同进程运行。此时 capability 声明服务于兼容判断、用户授权和事后审计，**不构成安全边界**——同进程的受信代码在技术上完全可以绕过标准 API 直接调用系统接口。宿主**必须**在产品界面或文档中显著公示这一事实，不得把"插件声明过了"包装成"越权行为被拦住了"。用户看到的每一句"权限"描述，都必须配得上技术现实。

### 2.4 `capabilities`：只能声明实际实现的精确条目

- 数组，每个元素**必须**是 `{ "apiVersion", "kind" }` 两个字段齐全的**精确契约坐标**，且该坐标**必须**是 [registry/](../registry/README.md) 中的真实条目（或符合 `x-org.example.*` 规则的私有条目，规则见 [VERSIONING.md](../VERSIONING.md)）。缺 `kind` 之类的模糊写法不合法。
- 宿主**必须**只声明自己实际实现并能保持语义的条目——**不许声明"大概支持"**。上游变化导致某项能力无法保持语义时，宿主**必须**把对应条目下线（fail closed：宁可承认没有，不用近似实现伪装兼容）。声明与真实行为的一致性由 Host conformance 套件对照断言。
- 缺失 `capabilities` 字段必须被拒绝。

### 2.5 `apiVersions`

对象，key 为 facet 名，值为该 facet 支持的 Host API 版本数组，如 `{ "host": ["v1alpha1"] }`。v0.15 只规范 `host` facet（见 [facet-model.md](facet-model.md)）。协商时的匹配规则见 [negotiation.md](negotiation.md)。

### 2.6 `platforms`

字符串数组，元素为 `<os>-<arch>` 形式的平台标识，如 `"darwin-arm64"`、`"win32-x64"`、`"linux-x64"`。省略表示不限平台。

### 2.7 诚实声明的总原则

Descriptor 只报告宿主**实际**提供的运行时与信任档位。特别注意：**不得**用 `hostType`、`isRemote` 之类的字段代替声明。Remote SSH 反例已经证明，"代码在哪执行、界面长什么样、谁有权批准"是三个独立维度——一个 `isRemote: true` 什么都说明不了（论证见 [RFC 0002](../rfcs/0002-runtime-presentation.md)）。同理，静态声明"可能存在某种界面"不会因此成为 activation 范围内的能力。

## 3. 市场五态与不得互相升级

市场与启动器在安装前展示的兼容状态**必须**恰好区分以下五态：

| 状态 | 含义 | 来源 |
| --- | --- | --- |
| 声明兼容 | 静态协商通过 | 协商 verdict `compatible`（见 [negotiation.md](negotiation.md)） |
| 等待授权 | 宿主支持，但敏感能力未获用户授权 | 协商 verdict `pending-authorization` |
| 已实测 | 明确的宿主、系统、插件与测试套件组合跑通过 | 一致性测试证据（见 [conformance.md](conformance.md)） |
| 不兼容 | required 契约或 API 范围无法满足 | 协商 verdict `rejected` |
| 未知 | 信息不足，无法判定 | 缺 manifest / Descriptor / registry 条目等 |

**五态不得互相升级（必须）**。这条规则的含义值得展开：五态是一条证据强度的阶梯——"声明兼容"只是纸面核对通过，"已实测"是真机跑过，两者差着十万八千里，而"安全"根本不在这条阶梯上。任何界面不得把静态协商结果展示成实测证据或安全审核结论。社区插件雷达那句口号说得很准：**收录不等于兼容，静态检查不等于运行可用，运行可用也不等于安全。**

默认交互**应该**展示但禁用不兼容插件，并列出缺失的契约——而不是直接隐藏。直接隐藏会让跨设备或跨 profile 的插件看起来凭空消失，用户只会以为市场坏了。

## 4. 示例

```json
{
  "descriptorVersion": "0.15",
  "id": "org.example.dsh-webui",
  "apiVersions": { "host": ["v1alpha1"] },
  "execution": {
    "environment": "node",
    "trustMode": "trusted-in-process"
  },
  "capabilities": [
    { "apiVersion": "commands.dsh/v1alpha1", "kind": "Command" },
    { "apiVersion": "storage.dsh/v1alpha1", "kind": "LocalStorage" },
    { "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver" }
  ],
  "platforms": ["darwin-arm64", "win32-x64", "linux-x64"]
}
```

（坐标与 ID 均为示意，以 Registry 定案为准。）

## 5. 错误与边界情况

| 情况 | 规定行为 | 抓住它的 fixture / 测试 |
| --- | --- | --- |
| 缺 `descriptorVersion` 或值非 `"0.15"` | 拒绝该 Descriptor | `invalid/missing-descriptor-version.json` |
| 缺 `execution` | 拒绝（信任档位必须显式公示） | `invalid/missing-execution.json` |
| `trustMode` / `environment` 为未定义值 | 拒绝 | `invalid/unknown-trust-mode.json`、`invalid/unknown-environment.json` |
| `capabilities` 元素不是精确坐标（缺字段） | 拒绝 | `invalid/capability-not-precise.json` |
| 缺 `capabilities` | 拒绝 | `invalid/missing-capabilities.json` |
| 声明了未实际实现的条目 | 一致性测试失败，不得宣称通过 | suites 行为对照断言 |
| 把 trusted-in-process 描述成沙箱 | 违反公示义务，不得宣称通过 Host conformance | suites 公示检查 |

## 6. 对应 fixtures 清单

fixtures 由后续任务创建，路径约定如下：

- `conformance/fixtures/host-descriptor/valid/minimal.json`
- `conformance/fixtures/host-descriptor/valid/full.json`
- `conformance/fixtures/host-descriptor/invalid/missing-descriptor-version.json`
- `conformance/fixtures/host-descriptor/invalid/missing-execution.json`
- `conformance/fixtures/host-descriptor/invalid/missing-capabilities.json`
- `conformance/fixtures/host-descriptor/invalid/capability-not-precise.json`
- `conformance/fixtures/host-descriptor/invalid/unknown-trust-mode.json`
- `conformance/fixtures/host-descriptor/invalid/unknown-environment.json`

## 7. 变更记录

| 版本 | 变更 |
| --- | --- |
| v0.15 | 首版成稿。`capabilities` 从名称-版本映射改为 registry 精确坐标条目；`trustMode` 收敛为唯一已定义档位 `trusted-in-process` 并落实公示义务；市场五态规则定稿于此。源自 v0.1 设计稿 §3.1 交付物 2 与原则 ③④。 |
