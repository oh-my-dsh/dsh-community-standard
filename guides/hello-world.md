# 从零开始：一个 Hello World 插件

> **状态：Draft v0.15（社区讨论稿，非官方标准）｜ 本文非规范，与 spec/ 冲突时以 spec/ 为准**
>
> 本文用一个插件的八次生长，演示这套标准怎么声明、怎么开发。每一步只加一个能力，每步的插件都是完整可跑的。代码中的 SDK 形态为示意，以 [spec/facet-api.md](../spec/facet-api.md) 定稿为准。

我们要做的插件叫 `com.example.hello-dsh`。它将依次学会：

1. 响应一个 `/hello` 命令，打出 Hello World；
2. 记住这是第几次打招呼；
3. 听到新消息时打声招呼；
4. 宿主没有消息能力时照样能活；
5. 装上宿主之前，先跑一遍本地校验；
6. 把 Hello World 放进侧边栏、对话 tab 和右侧面板；
7. 让打招呼文案和计数起点变成用户可配置的；
8. 给自己换个皮肤，染成主题色。

整个插件的核心自始至终只有**两个文件**：一份声明（`dsh-plugin.json`），一份代码（`host.ts`）；第六步会多出一个可选的视图组件文件。声明告诉宿主"我要什么"，代码只在协商通过后拿到声明过的能力——这就是这套标准的全部玩法。

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

## 第六步：把 Hello World 摆进 UI

> **本节基于 [RFC 0005](../rfcs/0005-declarative-views.md)（声明式视图贡献点，Draft，目标 v0.16）。** 方向已经定稿，但宿主实现还在跟进——装上今天的宿主，协商报告会如实告诉你"这个契约我还不支持"。这不是缺陷，正是这套标准的设计意图：装之前就知道，而不是装上再炸。

还是那份 manifest，玩法也一样：先在 `requires` 里声明视图契约，再在 `contributes.views` 里声明视图。最小的形态是**纯声明视图**——只给标题和静态文本，宿主原生渲染，一行 UI 代码都不用写：

```jsonc
// 字段布局为示意，以 spec 定稿为准
"requires": {
  "contracts": [
    // ……前几步的契约照旧
    { "apiVersion": "views.dsh/v1alpha1", "kind": "ViewContribution", "optional": true }
  ]
},
"contributes": {
  "views": [
    {
      "id": "com.example.hello-dsh.sidebar",
      "title": "Hello World",
      "location": "sidebar.footer",        // 左侧边栏底部
      "static": { "text": "Hello World！" } // 纯声明：宿主自己渲染
    }
  ]
}
```

想摆在对话区 tab 或右侧面板，换 `location` 就行。这两个位置通常配富组件——`component` 指向一个预构建 bundle，宿主挂载它、注入标准 props，卸载时自动清理：

```jsonc
"contributes": {
  "views": [
    { "id": "com.example.hello-dsh.chat-tab", "title": "Hello", "location": "conversation.tab", "component": "dist/views/hello.js" },
    { "id": "com.example.hello-dsh.inspector", "title": "Hello", "location": "details.panel", "component": "dist/views/hello.js" }
  ]
}
```

```tsx
// src/views/hello.tsx（示意：预构建为 dist/views/hello.js，react 由宿主作为种子模块提供）
export default function HelloView() {
  return <div>Hello World！</div>
}
```

三条规则，和前五步一脉相承：

- **`location` 只能写 registry 里登记过的位置**（一期就三个：`conversation.tab`、`details.panel`、`sidebar.footer`）。宿主没实现的位置，协商时就报出来——标了 `optional: true` 就降级，没标就拒载，总之不会装上再炸。
- **排布写 `priority`（`high | normal | low`），不写数字。** 你的插件不需要知道别的插件存在，宿主按优先级类别排。
- **摆成什么样是宿主的事。** 同一个 `conversation.tab`，Web 宿主渲染成页签，TUI 宿主可能渲染成切换面板——插件不关心，也不能关心。

## 第七步：让用户能配置（设置项）

第六步开头那句"方向已定稿、宿主实现还在跟进"，从这里起每步都适用，不再重复。

到目前为止，打招呼文案和计数起点都写死在代码里。想让用户自己改，玩法还是一样：在 manifest 里声明，不写设置 UI——

```jsonc
// 字段布局为示意，以 spec 定稿为准
"contributes": {
  "settings": {
    "namespace": "com.example.hello-dsh",   // 反向域名，设置按 namespace 隔离
    "title": "Hello World",
    "schema": {                              // 内联 JSON Schema
      "type": "object",
      "properties": {
        "greeting": { "type": "string", "title": "打招呼文案", "default": "Hello World" },
        "startAt": { "type": "integer", "title": "计数起点", "default": 0, "minimum": 0 }
      }
    }
  }
}
```

就这些。`schema` 一声明，宿主照着 JSON Schema 自动生成设置表单——标题、输入框、默认值、校验全包，**插件一行表单代码都不用写**。这和纯声明视图是同一个道理，也和你第一步就见过的那条规则是同一哲学：声明什么，才能用什么。

两个细节：

- **不用再声明新契约。** 设置项搭的是第六步 `views.dsh/v1alpha1` 的车——表单本质是宿主设置页里的一节视图，落在 `settings.section` 这个登记过的 location 上。
- **设置按 namespace 隔离。** 代码里经 settings 句柄读写，只摸得到自己 namespace 下的键，别人家的设置碰不到——和存储的私有性同一条纪律。

代码里把写死的值换成读设置（句柄形态示意，以 spec 定稿为准）：

```ts
export default defineFacet((activation) => {
  const storage = activation.contracts.get(
    { apiVersion: 'storage.dsh/v1alpha1', kind: 'LocalStorage' }
  )
  const views = activation.contracts.get(
    { apiVersion: 'views.dsh/v1alpha1', kind: 'ViewContribution' }
  )

  activation.extensions.publish(
    { apiVersion: 'commands.dsh/v1alpha1', kind: 'Command' },
    'com.example.hello-dsh.say-hello',
    async () => {
      const greeting = ((await views.settings.get('greeting')) as string | undefined) ?? 'Hello World'
      const startAt = ((await views.settings.get('startAt')) as number | undefined) ?? 0
      const count = ((await storage.get('count')) as number | undefined) ?? startAt
      await storage.set('count', count + 1)
      activation.log.info(`${greeting}！这是第 ${count + 1} 次`)
    }
  )
})
```

用户在设置页改了文案，下一次 `/hello` 就是新的话——你的代码只多了一扇领取设置的窗口，其余一行没变。

## 第八步：给它换个皮肤（主题）

最后一步，一行代码都不用改，只动 manifest。这个插件顺带贡献一个皮肤，把界面染成自己的主题色：

```jsonc
// 字段布局为示意，以 spec 定稿为准
"requires": {
  "contracts": [
    // ……前几步的契约照旧
    { "apiVersion": "themes.dsh/v1alpha1", "kind": "Theme", "optional": true }
  ]
},
"contributes": {
  "themes": [
    {
      "id": "com.example.hello-dsh.mint",
      "title": "Hello Mint",
      "tokens": {
        "--dsw-alias-accent": "#3ec98f",
        "--dsw-alias-bg-primary": "#f0faf5",
        "--dsw-alias-text-primary": "#12372a"
      },
      "dark": {                                   // 暗色覆盖，可选
        "--dsw-alias-bg-primary": "#0f2b21",
        "--dsw-alias-text-primary": "#d9f5e8"
      }
    }
  ]
}
```

三条规则，听完你会觉得耳熟：

- **`tokens` 的键只能来自 registry 令牌表里的 `--dsw-*` 令牌。** 自造一个 `--hello-green`，第五步那个校验工具当场就报出来——和"location 只能写登记过的位置"是同一条纪律。
- **宿主同时只激活一个皮肤主题。** 用户启用你的 Hello Mint，别的皮肤就退场，不叠加、不打架；`dark` 里的覆盖只在暗色模式下生效。
- **卸载即还原。** 令牌值随主题来去，卸载或一切换，界面立刻回到原样——没有残留 patch，没有 MutationObserver，没有给零承诺钩子写的自愈代码。皮肤插件当年那些野路子，到此为止。

## 回头看一眼

八步走完，这个插件碰过的所有东西：一份静态 JSON、一个 `defineFacet`、三面上下文（`extensions` / `contracts` / `scope`）、五条 registry 契约（commands、storage、messages、views、themes——设置项搭 views 契约的车，不新增坐标）。没有 patch，没有反射探测，没有宿主内部函数。这就是为什么它能穿越 dsh 上游的更新周期——它依赖的是契约，不是实现；官方改内部 UI，变化由 SDK 适配层吸收，插件零感知。

想写真正的插件，接着读[插件作者指南](plugin-author.md)；从 patch 流派迁移过来的，直接读[迁移指南](migration.md)。

## 关联

- [spec/facet-api.md](../spec/facet-api.md) —— `defineFacet` 与三面上下文的逐条签名（草案）
- [spec/manifest.md](../spec/manifest.md) —— manifest 逐字段权威定义
- [spec/views.md](../spec/views.md) —— `contributes.views` 与设置贡献点（草案）
- [spec/themes.md](../spec/themes.md) —— `contributes.themes` 与 `--dsw-*` 令牌表（草案）
- [registry/](../registry/README.md) —— 契约坐标的机器可读条目
- [插件作者指南](plugin-author.md) —— 声明/绑定纪律、协商报告与报错对照
- [RFC 0005](../rfcs/0005-declarative-views.md) —— 第六到八步视图、设置、主题贡献点的标准本体
