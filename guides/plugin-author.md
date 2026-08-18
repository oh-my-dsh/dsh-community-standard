# 插件作者指南（Plugin Author Guide）

> **状态：Draft v0.15（社区讨论稿，非官方标准）｜ 本文非规范，与 spec/ 冲突时以 spec/ 为准**
>
> 规范可以严肃，指南必须说人话。本文的目标：让你在 10 分钟内写出一个能被标准宿主加载的插件。

## 0. 先说清楚：为什么不能再 patch 了

dsh 生态已经验证过一次：loader 混战时代，官方一统一注册方式，所有第三方 loader 一夜全废；靠源码 patch 活着的插件，dsh 每更新一次就批量炸一轮。**依赖实现的生态会死，依赖标准的生态才能穿越上游的更新周期。**

所以这套标准里，插件不再"拿到句柄为所欲为"，而是：

1. 用一份静态 `dsh-plugin.json` 声明"我是谁、我需要什么"；
2. 宿主在安装/加载前就能判断"这个插件我跑不跑得动"，跑不动就干净拒载，而不是装上再炸；
3. 你写的代码只碰协商后注入的标准能力，不碰宿主内部函数。

你以前的野路子，对照标准路径长这样：

| 你以前的做法 | v0.15 的标准路径 |
| --- | --- |
| patch 宿主源码 / monkey patch 内部函数 | **没有合法对应物。** 只想"看到发生了什么"的，改用 `messages.dsh/v1alpha1` 观察事件；想"修改行为"的，属于 `before-*` 可修改事件，已延期（见本文 §6） |
| 硬编码内部事件名订阅（如某个 session event 字符串） | `messages.dsh/v1alpha1`（MessageObserver）+ manifest 里的 `subscriptions` |
| `ctx.get()` 反射探测宿主内部服务，探到就用 | manifest 里 `requires.contracts` 静态声明，协商通过后由宿主注入，探不到就在装之前被拒载 |
| 往宿主目录 / 工作区直接写文件存状态 | `storage.dsh/v1alpha1`（LocalStorage）：插件私有、宿主管理的持久化 |
| patch UI 代码注册命令 / 调内部命令注册函数 | `commands.dsh/v1alpha1`（Command）+ manifest 里的 `contributes.commands` 声明 |

v0.15 的契约坐标一共就这三条，全部在 [registry/](../registry/README.md) 里有机器可读条目。下面开始动手。

## 1. 写一份 manifest（`dsh-plugin.json`）

在包的**根目录**新建 `dsh-plugin.json`——特意不叫 `plugin.json`，因为那个名字已被 [Agent Plugins Specification](https://agent-plugins.org/) 占用，一个包可以同时携带两份文件支持两套生态。

抄这份完整示例（一个"记住最后一条消息"的插件）：

```json
{
  "$schema": "https://dsh-std.example/schemas/dsh-plugin/v0.15.json",
  "id": "com.example.message-memory",
  "name": "Message Memory",
  "version": "1.0.0",
  "manifestVersion": "0.15",
  "facets": {
    "host": { "entry": "dist/host.js", "apiVersion": "v1alpha1" }
  },
  "requires": {
    "contracts": [
      { "apiVersion": "commands.dsh/v1alpha1", "kind": "Command" },
      { "apiVersion": "storage.dsh/v1alpha1", "kind": "LocalStorage" },
      { "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver" }
    ]
  },
  "permissions": [],
  "contributes": {
    "commands": [
      { "id": "com.example.message-memory.show-last", "title": "Show Last Message" }
    ]
  },
  "subscriptions": ["messages.observe"]
}
```

（`$schema` 的 URL 为示意，以 Registry 定案为准。）

逐字段的权威定义在 [spec/manifest.md](../spec/manifest.md)，这里只讲最容易踩的坑：

- **`$schema` 必填。** 宿主靠它选择本地自带的 schema 来校验你的 manifest，不会联网去取。少了它，第一步校验就过不去。
- **`id` 用反向域名**（`com.example.xxx`），别用短名字——你的 `id` 和 `contributes` 里的命令 id 要全局唯一，两个插件贡献同一个 id 会在安装前被静态冲突检测拦下。
- **manifest 必须是静态 JSON。** 不能用 JS 动态生成——市场、启动器、校验工具都要在不执行你代码的前提下读懂它。
- **v0.15 会直接拒绝 `provides` 和 `requires.services` 字段**，写了就校验失败。插件间服务组合是 [RFC 0003](../rfcs/0003-service-composition.md) 的范围，别在 manifest 里提前写。

## 2. 声明依赖：`requires.contracts` 的 required / optional

`requires.contracts` 里每一项是一条 registry 精确条目（`apiVersion + kind`），默认是 **required**：

- **required 缺一个，宿主直接拒载**，并在拒载提示里告诉用户缺什么。这是feature不是bug：宁可装不上，不要装上炸。
- **optional** 加 `"optional": true`：宿主没有这条能力时插件照常激活，但对应 API 不存在，你的代码必须自己走降级路径：

```json
{ "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver", "optional": true }
```

```ts
// optional 能力必须先检查再用（示意，以 SDK 定案为准）
if (activation.capabilities.messages) {
  activation.capabilities.messages.observe(handler)
} else {
  activation.log.info('当前宿主不支持消息观察，相关功能已关闭')
}
```

经验法则：**没有它你的核心功能就不成立的，写 required；没有它只是少个锦上添花功能的，写 optional 并认真写降级分支。**

## 3. 用 `defineFacet` 写一个 command

宿主侧入口（`facets.host.entry` 指向的文件）导出一个 `defineFacet` 调用。以下示例基于社区已验证的形态（dsh-codex 重构分支，见 [community#24 讨论](https://github.com/omdsh-dev/community/issues/24)）；**SDK 包名与签名尚未冻结，以 [spec/facet-model.md](../spec/facet-model.md) 与 SDK 定案为准**：

```ts
// src/host.ts（示意，以 SDK 定案为准）
import { defineFacet } from '@dsh-std/sdk'

export default defineFacet((activation) => {
  // 协商后注入的能力：manifest requires 里声明过的才会出现
  const { storage, messages } = activation.capabilities

  // 观察消息事件（对应 manifest 里的 subscriptions）
  const observer = messages.observe(async (event) => {
    await storage.set('lastMessageId', event.payload.id)
  })

  // 为 manifest contributes.commands 里声明过的 id 绑定 handler
  activation.extensions.publish(
    { apiVersion: 'commands.dsh/v1alpha1', kind: 'Command' },
    'com.example.message-memory.show-last',
    async () => {
      const lastMessageId = await storage.get('lastMessageId')
      activation.log.info('Last observed message', { lastMessageId })
    }
  )

  // 清理挂到 activation 的作用域上，deactivate 时自动执行
  activation.scope.add(() => observer.dispose())
})
```

三条纪律：

1. **声明了就要绑定，绑定了必须已声明。** "contributes 里声明了命令但没 publish handler"和"publish 了 manifest 里没声明的 id"都会被校验和一致性测试报出来。
2. **v0.15 的 command 是 flat action leaf**：一个全局唯一 id 对应一个 handler，完事。子命令树、交互式 prompt、流式输出都不在 v0.15 里（归 [RFC 0002](../rfcs/0002-runtime-presentation.md)），别往 command 里塞 device code、二维码这类短期交互内容。
3. **清理要可重复。** 宿主正常关闭时会 best-effort 地 deactivate，但进程崩溃、断电、强制终止时不保证你的清理能跑到；HMR 或 profile 重组还可能让同一插件重复 activate/dispose。把清理写成"跑两遍也不出事"的幂等逻辑。

## 4. 本地跑校验

不用等装上宿主才知道错在哪。校验工具按 [schemas/dsh-plugin.schema.json](../schemas/dsh-plugin.schema.json) 做静态校验：

```bash
# 示意：校验器 CLI 形态以各工具实现为准
npx dsh-plugin-verify ./dsh-plugin.json
```

社区验证工具 [dsh-plugin-verify](https://github.com/omdsh-dev/community/issues/23)（community#23 评论 7）已声明会按标准 schema 做一致性校验。校验覆盖的事包括：`$schema` 是否存在且被识别、字段是否符合 schema、契约坐标是否能在 registry 里查到、`contributes` id 是否与其他已知插件冲突、声明与绑定是否一致。

## 5. 看协商报告

校验过了，下一步是宿主侧的**协商**：你的 manifest × 宿主的 Host Descriptor → 一份机器可读的协商报告（格式权威定义见 [spec/negotiation.md](../spec/negotiation.md) 与 [schemas/negotiation-report.schema.json](../schemas/negotiation-report.schema.json)）。三种结局：

- **兼容**：所有 required 契约宿主都实现了，可以激活；
- **待授权**：能力都有，但涉及敏感 scope，要等用户或策略授权；
- **拒载**：required 缺失，报告里会列出缺哪条、为什么。

一份拒载报告长这样（字段名为示意，以 schema 定案为准）：

```json
{
  "reportVersion": "0.15",
  "plugin": { "id": "com.example.message-memory", "version": "1.0.0" },
  "host": { "id": "org.example.dsh-tui", "version": "2.1.0" },
  "verdict": "rejected",
  "missing": [
    {
      "apiVersion": "messages.dsh/v1alpha1",
      "kind": "MessageObserver",
      "required": true,
      "reason": "host does not implement this registry entry"
    }
  ]
}
```

拿到拒载报告后的选择就三条：把缺的能力改 optional 并写降级路径；换一个实现了该能力的宿主；或者等——去社区推动那条能力进入标准。

## 6. 常见拒载报错对照表

> 报错文案为示意，准确格式以 [spec/negotiation.md](../spec/negotiation.md)、[spec/manifest.md](../spec/manifest.md) 与 schemas 定案为准。

| 报错（示意） | 是什么意思 | 怎么改 |
| --- | --- | --- |
| `missing required contract: commands.dsh/v1alpha1 Command` | 宿主没实现这条 registry 条目，而你把它标成了 required | 改 optional 并写降级路径；或换宿主 |
| `unknown contract coordinate: command.dsh/v1alpha1` | 坐标拼错了或自造了一个，registry 里查不到 | 对照 [registry/](../registry/README.md) 里的精确条目改 |
| `$schema is required` | manifest 缺 `$schema` 字段 | 补上 canonical schema identifier（见 §1 示例） |
| `unsupported declaration: provides` | v0.15 拒绝 `provides` 字段 | 删掉；插件间服务组合等 [RFC 0003](../rfcs/0003-service-composition.md) |
| `unsupported declaration: requires.services` | 同上，v0.15 拒绝 `requires.services` | 删掉，同上 |
| `duplicate contribution id: com.example.foo.bar` | 你贡献的命令 id 和另一个插件撞了 | id 加上你自己的反向域名前缀 |
| `contribution declared but not bound` | manifest 声明了命令，代码里没 publish handler | 补上绑定，或删掉声明 |
| `bound but not declared` | 代码 publish 了 manifest 里没声明的 id | 在 `contributes.commands` 里补上声明 |
| `apiVersion range not satisfied` | 你声明的契约版本超出宿主支持范围 | 看宿主 Host Descriptor 里的 `apiVersions`，对齐后重试 |

## 7. 标准暂时接不住的需求（诚实清单）

以下需求 v0.15 没有标准路径，写插件前先确认你不依赖它们：

- **修改 / 拦截消息与行为**（`before-*` 可修改事件）→ 延期，前置条件清单见 [RFC 0002](../rfcs/0002-runtime-presentation.md)
- **插件之间互相调用、注册 provider**（搜索 provider、模型 provider 等）→ [RFC 0003](../rfcs/0003-service-composition.md)
- **自定义 UI 面板、富视图、command tree、交互式 prompt、短期呈现通道**（device code / 二维码 / 确认请求）→ [RFC 0002](../rfcs/0002-runtime-presentation.md)
- **联网、读写文件系统、子进程 / PTY** → 敏感能力，各自需要独立 RFC 与授权 UX
- **跨 face bridge**（Host ↔ Client 强类型 RPC）→ [RFC 0002](../rfcs/0002-runtime-presentation.md)

如果你是从现有 patch 流派插件迁移过来的，直接读[迁移指南](migration.md)。

## 关联

- [spec/manifest.md](../spec/manifest.md) —— manifest 逐字段权威定义
- [spec/facet-model.md](../spec/facet-model.md) —— `defineFacet` 上下文的最小 API 面
- [spec/negotiation.md](../spec/negotiation.md) —— 协商与拒载语义
- [spec/lifecycle.md](../spec/lifecycle.md) —— 激活生命周期
- [registry/](../registry/README.md) —— 契约坐标与机器可读条目
- [迁移指南](migration.md) —— 从 patch 流派迁移
