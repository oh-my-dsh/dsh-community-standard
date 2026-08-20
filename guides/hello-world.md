# 从零开始：一个 Hello World 插件

> **状态：Draft v0.15（社区讨论稿，非官方标准）｜ 本文非规范，与 spec/ 冲突时以 spec/ 为准**
>
> 本文用一个插件的六次生长，演示这套标准怎么声明、怎么开发。每一步只加一个能力，每步的插件都是完整可跑的。代码中的 SDK 形态为示意，以 [spec/facet-api.md](../spec/facet-api.md) 定稿为准。

我们要做的插件叫 `com.example.hello-dsh`。它将依次学会：

1. 响应一个 `/hello` 命令，打出 Hello World；
2. 记住这是第几次打招呼；
3. 听到新消息时打声招呼；
4. 宿主没有消息能力时照样能活；
5. 装上宿主之前，先跑一遍本地校验；
6. （预览）把 Hello World 放进侧边栏、对话 tab 和右侧面板。

整个插件自始至终只有**两个文件**：一份声明（`dsh-plugin.json`），一份代码（`host.ts`）。声明告诉宿主"我要什么"，代码只在协商通过后拿到声明过的能力——这就是这套标准的全部玩法。

## 第一步：响应 `/hello` 命令

`dsh-plugin.json`（放在包根目录）：

```json
{
  "$schema": "https://dsh-std.example/schemas/dsh-plugin/v0.15.json",
  "id": "com.example.hello-dsh",
  "name": "Hello dsh",
  "version": "0.1.0",
  "manifestVersion": "0.15",
  "facets": {
    "host": { "entry": "dist/host.js", "apiVersion": "v1alpha1" }
  },
  "requires": {
    "contracts": [
      { "apiVersion": "commands.dsh/v1alpha1", "kind": "Command" }
    ]
  },
  "contributes": {
    "commands": [
      { "id": "com.example.hello-dsh.say-hello", "title": "Say Hello" }
    ]
  }
}
```

`host.ts`：

```ts
import { defineFacet } from '@dsh-std/sdk' // 包名示意，以 SDK 定案为准

export default defineFacet((activation) => {
  activation.extensions.publish(
    { apiVersion: 'commands.dsh/v1alpha1', kind: 'Command' },
    'com.example.hello-dsh.say-hello',
    () => {
      activation.log.info('Hello World')
    }
  )
})
```

就这些。宿主读到 `contributes.commands`，就会把这个命令摆到它自己的入口上——TUI 宿主可能让你输入 `/hello` 触发，图形宿主可能放进命令面板。**摆在哪里是宿主的事，你的插件不用关心**；你只管声明命令、绑定 handler。

注意 handler 里没有任何"找到输出框、往里写字"的代码。v0.15 的 command 是扁平动作叶子：触发、执行、返回，完事。

## 第二步：记住这是第几次

加一个能力，只需在 manifest 里多声明一条契约，然后到统一窗口领句柄：

```json
"requires": {
  "contracts": [
    { "apiVersion": "commands.dsh/v1alpha1", "kind": "Command" },
    { "apiVersion": "storage.dsh/v1alpha1", "kind": "LocalStorage" }
  ]
}
```

```ts
export default defineFacet((activation) => {
  const storage = activation.contracts.get(
    { apiVersion: 'storage.dsh/v1alpha1', kind: 'LocalStorage' }
  )

  activation.extensions.publish(
    { apiVersion: 'commands.dsh/v1alpha1', kind: 'Command' },
    'com.example.hello-dsh.say-hello',
    async () => {
      const count = ((await storage.get('count')) as number | undefined) ?? 0
      await storage.set('count', count + 1)
      activation.log.info(`Hello World！这是第 ${count + 1} 次`)
    }
  )
})
```

`contracts.get(坐标)` 是领取能力的统一窗口：输入 registry 里的坐标，取出对应的句柄。存储是插件私有、宿主管理的——插件更新、重启之后数据还在，别的插件碰不到。

一条硬规则：**没声明的契约，`get` 会直接抛 `E_CONTRACT_NOT_DECLARED`**，哪怕宿主其实支持。声明什么才能用什么，这是运行时的强制检查，不是建议。

## 第三步：听到新消息就打招呼

再进一步：不等人点命令，消息来了主动反应。这需要两样声明——订阅事件，加上声明观察契约：

```json
"requires": {
  "contracts": [
    { "apiVersion": "commands.dsh/v1alpha1", "kind": "Command" },
    { "apiVersion": "storage.dsh/v1alpha1", "kind": "LocalStorage" },
    { "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver" }
  ]
},
"subscriptions": ["messages.observe"]
```

```ts
export default defineFacet((activation) => {
  const messages = activation.contracts.get(
    { apiVersion: 'messages.dsh/v1alpha1', kind: 'MessageObserver' }
  )

  const observer = messages.observe((envelope) => {
    activation.log.info('Hello World！看到新消息', { id: envelope.payload.messageId })
  })

  // 清理挂到 activation 作用域上，deactivate 时宿主自动调用
  activation.scope.add(() => observer.dispose())
})
```

两个新知识点：

- **observer 只能看，不能动。** 信封只读，改写不会有任何效果；想拦截、修改消息，属于 `before-*` 可修改事件，已延期到 [RFC 0002](../rfcs/0002-runtime-presentation.md)。
- **消息是高敏感数据。** 宿主支持不等于用户已授权——这一步装上宿主后，协商结果可能是"待授权"，等用户点头才开始投递。宿主给你的数据还可能是按 `privacyClass` 裁剪过的。

## 第四步：宿主没有消息能力，照样能活

不是每个宿主都实现了消息观察。把第三步的契约改成 optional，插件在缺能力的宿主上照常激活，走降级分支：

```json
{ "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver", "optional": true }
```

```ts
const coordinate = { apiVersion: 'messages.dsh/v1alpha1', kind: 'MessageObserver' }

if (activation.contracts.has(coordinate)) {
  const messages = activation.contracts.get(coordinate)
  activation.scope.add(messages.observe(/* ... */).dispose)
} else {
  activation.log.info('当前宿主不支持消息观察，打招呼功能已关闭，/hello 仍然可用')
}
```

required 和 optional 的分寸：**没有它插件就不成立的，写 required（缺了宁可拒载）；没有它只是少个添头的，写 optional 并认真写降级分支。** 拒载不是事故——宿主会给出机器可读的报告，告诉用户缺什么，而不是装上再炸。

## 第五步：装之前，先跑本地校验

到这里插件已经功能完整。装到宿主之前，先让校验工具过一遍 manifest（CLI 形态示意，以工具实现为准）：

```bash
npx dsh-plugin-verify ./dsh-plugin.json
```

它会静态检查：`$schema` 是否可识别、字段是否合法、契约坐标在 [registry/](../registry/README.md) 里查不查得到、`contributes` 的 id 有没有和已知插件撞车、声明与绑定是否一致。全过了，才轮到宿主做协商；协商的三种结局（兼容 / 待授权 / 拒载）和报错对照表，见[插件作者指南](plugin-author.md) §5–§6。

## 第六步（预览）：把 Hello World 摆进 UI

> **下面全部不是 v0.15 标准。** v0.15 只规范 host facet；`client` / `worker` 是保留名，侧边栏、tab、面板这类声明式 UI 整体归 [RFC 0002](../rfcs/0002-runtime-presentation.md)，形态未表决。以下代码是**假想语法**，只用来展示方向，不要照抄实现。

如果 RFC 0002 落地，"在左边侧边栏加一个 Hello World 入口"大概长这样——还是那份 manifest，多几行声明：

```jsonc
// 假想语法，非标准
"contributes": {
  "views": [
    { "id": "com.example.hello-dsh.sidebar", "title": "Hello World", "location": "sidebar.left" }
  ]
}
```

对话列表上加一个 tab、右侧边栏加一块面板，换的也只是 `location`：

```jsonc
// 假想语法，非标准
{ "id": "com.example.hello-dsh.chat-tab", "title": "Hello World", "location": "conversation.tab" }
{ "id": "com.example.hello-dsh.inspector", "title": "Hello World", "location": "sidebar.right" }
```

方向上依然是同一个套路：**你声明"有什么"，宿主决定"摆在哪、长什么样"**。之所以 v0.15 刻意不做，是因为声明式 UI 要穿越 Remote SSH 这类 transport 分层，做仓促了会在半路丢子树——这个反例和完整设计见 [RFC 0002](../rfcs/0002-runtime-presentation.md)。今天的正确写法，就是第一到第五步的 host 侧能力。

## 回头看一眼

六步走完，这个插件碰过的所有东西：一份静态 JSON、一个 `defineFacet`、三面上下文（`extensions` / `contracts` / `scope`）、三条 registry 契约。没有 patch，没有反射探测，没有宿主内部函数。这就是为什么它能穿越 dsh 上游的更新周期——它依赖的是契约，不是实现。

想写真正的插件，接着读[插件作者指南](plugin-author.md)；从 patch 流派迁移过来的，直接读[迁移指南](migration.md)。

## 关联

- [spec/facet-api.md](../spec/facet-api.md) —— `defineFacet` 与三面上下文的逐条签名（草案）
- [spec/manifest.md](../spec/manifest.md) —— manifest 逐字段权威定义
- [registry/](../registry/README.md) —— 三条契约坐标的机器可读条目
- [插件作者指南](plugin-author.md) —— 声明/绑定纪律、协商报告与报错对照
- [RFC 0002](../rfcs/0002-runtime-presentation.md) —— UI 分层与第六步预览的归属
