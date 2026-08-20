# 从零开始：一个 Hello World 插件

> **状态：Draft v0.15（社区讨论稿，非官方标准）｜ 本文非规范，与 spec/ 冲突时以 spec/ 为准**
>
> 本文用一个插件的十四步演进，演示这套标准怎么声明、怎么开发。每一步只增加一个能力，而且每一步的插件都是完整可运行的。代码中的 SDK 形态为示意，以 [spec/facet-api.md](../spec/facet-api.md) 定稿为准。

我们要做的插件叫 `com.example.hello-dsh`。它将依次学会：

1. 响应一个 `/hello` 命令，打出 Hello World；
2. 记住这是第几次打招呼;
3. 听到新消息时打声招呼；
4. 在没有消息能力的宿主上，也能正常运行；
5. 安装之前，先在本地跑一遍静态校验；
6. 把 Hello World 放进侧边栏、对话 tab 和右侧面板；
7. 让打招呼文案和计数起点变成用户可配置的设置项；
8. 贡献一套主题配色，给界面换个皮肤。

前八步是声明式插件的基本功。但热门插件还有另一半本领——调用模型、注入提示词、定时执行、开放 HTTP 接口、读写文件、过滤事件——于是有了进阶篇：

9. 把记忆写成用户和 AI 都能直接修改的文件；
10. 让 AI 用指定的人设语气说话；
11. 让模型现场生成打招呼文案；
12. 每天到点自动执行，主动问好；
13. 给记忆开放一个 HTTP 接口；
14. 只订阅关心的消息类型，断线后还能从上次进度继续拉取。

走完十四步，这个插件将具备真实热门插件"小酒馆"（dsh-tavern-plugin）的全部本领，文末有一张逐条对照的终验表。

整个插件的核心自始至终只有**两个文件**：一份声明（`dsh-plugin.json`），一份代码（`host.ts`）；第六步会多出一个可选的视图组件文件。声明告诉宿主"我需要什么"，代码只在协商通过后拿到声明过的能力——这就是这套标准的全部机制。

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

就这些。宿主读到 `contributes.commands`，就会把这个命令安排到它自己的入口上——TUI 宿主可能让你输入 `/hello` 触发，图形宿主可能把它放进命令面板。**放在哪里、长什么样，是宿主的事，插件不用关心**；你只负责声明命令、绑定 handler。

注意 handler 里没有任何"找到输出框、往里写字"的代码。v0.15 的 command 是一个**扁平的动作（规范里叫 flat action leaf）**：触发、执行、结束，不接收参数，也不返回展示内容。

## 第二步：记住这是第几次

增加一个能力，只需要两个动作：在 manifest 里多声明一条契约，然后在代码里到统一窗口领取句柄。

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

`contracts.get(坐标)` 是领取能力的统一窗口：传入 registry 里登记的坐标，取回对应的句柄。这块存储是插件私有、由宿主管理的——插件更新、宿主重启之后数据仍在，其他插件也访问不到。

一条硬规则：**没有声明过的契约，`get` 会直接抛出 `E_CONTRACT_NOT_DECLARED`**——即使宿主实际支持这个能力也一样。声明什么才能用什么，这是运行时的强制检查，不是写作建议。

## 第三步：听到新消息就打招呼

再进一步：不等用户触发命令，消息一来就主动反应。这需要两处声明——声明消息观察契约，同时订阅消息事件：

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

  // 清理函数挂到 activation 作用域上，deactivate 时由宿主自动调用
  activation.scope.add(() => observer.dispose())
})
```

两个新知识点：

- **observer 只能观察，不能干预。** 信封是只读的，改写不会产生任何效果；想拦截或修改消息，那属于 `before-*` 可修改事件，已延期到 [RFC 0002](../rfcs/0002-runtime-presentation.md)。
- **消息内容是高敏感数据。** 宿主支持不等于用户已授权——这一步的插件安装之后，协商结果可能是"等待授权"，用户同意之后事件才会开始投递。即便开始投递，宿主交给你的数据也可能按 `privacyClass` 做过裁剪。

## 第四步：宿主没有消息能力，也要能正常运行

第三步其实埋了一个雷。消息观察写在 `requires` 里，默认是**必需依赖**——如果某个宿主（比如一个精简的 TUI）根本没有实现消息观察，整个插件会在安装时被直接拒载。也就是说，只因为"听到消息打招呼"这个锦上添花的功能缺了条件，用户连最核心的 `/hello` 都用不上了。

这显然不合理：**附加功能不应该绑架核心功能。** 解决办法是给这条契约标记 `"optional": true`：

```json
{ "apiVersion": "messages.dsh/v1alpha1", "kind": "MessageObserver", "optional": true }
```

加上之后，协商的结果就变了：宿主有这个能力，插件照常拿到句柄；宿主没有这个能力，协商依然放行、插件正常激活，只是**拿不到这个能力的句柄**。因此代码要先问一句"有没有"，再决定走哪条路：

```ts
const coordinate = { apiVersion: 'messages.dsh/v1alpha1', kind: 'MessageObserver' }

if (activation.contracts.has(coordinate)) {
  // 宿主有这个能力：和第三步一样订阅消息
  const messages = activation.contracts.get(coordinate)
  activation.scope.add(messages.observe(/* ... */).dispose)
} else {
  // 宿主没有：关闭附加功能，核心功能不受影响
  activation.log.info('当前宿主不支持消息观察，自动打招呼已关闭；/hello 命令不受影响')
}
```

required 和 optional 怎么选，判断标准只有一条：**缺了它插件就失去存在意义的，写 required——宁可拒载，也不装一个空壳；缺了它只是少一项附加功能的，写 optional，并且认真写好 else 分支的降级逻辑。**

顺便说明：拒载不是事故。宿主会给出一份机器可读的协商报告，明确告诉用户缺少什么——这比安装之后运行时崩溃体面得多。

## 第五步：安装之前，先跑本地校验

到这里插件的功能已经完整。安装到宿主之前，先让校验工具静态检查一遍 manifest（CLI 形态示意，以工具实现为准）：

```bash
npx dsh-plugin-verify ./dsh-plugin.json
```

它会检查：`$schema` 是否可识别、各字段是否合法、契约坐标在 [registry/](../registry/README.md) 里能否查到、`contributes` 的 id 是否与已知插件冲突、声明与代码绑定是否一致。全部通过之后，才轮到宿主做协商；协商的三种结果（兼容 / 等待授权 / 拒载）和报错对照表，见[插件作者指南](plugin-author.md) §5–§6。

## 第六步：把 Hello World 放进 UI

> **本节基于 [RFC 0005](../rfcs/0005-declarative-views.md)（声明式视图贡献点，Draft，目标 v0.16）。** 方向已经定稿，但宿主实现还在跟进——安装到今天的宿主上，协商报告会如实告诉你"这个契约我还不支持"。这不是缺陷，恰恰是这套标准的设计意图：安装之前就知道，而不是安装之后才崩溃。

还是那份 manifest，做法也一样：先在 `requires` 里声明视图契约，再在 `contributes.views` 里声明视图。最小的形态是**纯声明视图**——只给标题和静态文本，由宿主原生渲染，一行 UI 代码都不用写：

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

想放到对话区 tab 或右侧面板，换一个 `location` 就可以。这两个位置通常需要**富组件**——`component` 指向一个预构建的 bundle，宿主负责挂载它、注入标准 props，并在卸载时自动清理：

```jsonc
"contributes": {
  "views": [
    { "id": "com.example.hello-dsh.chat-tab", "title": "Hello", "location": "conversation.tab", "component": "dist/views/hello.js" },
    { "id": "com.example.hello-dsh.inspector", "title": "Hello", "location": "details.panel", "component": "dist/views/hello.js" }
  ]
}
```

```tsx
// src/views/hello.tsx（示意：预构建为 dist/views/hello.js）
// react 由宿主作为共享依赖统一提供，不用打包进你的 bundle
export default function HelloView() {
  return <div>Hello World！</div>
}
```

三条规则，和前五步一脉相承：

- **`location` 只能填 registry 里登记过的位置**（完整清单见 [spec/views.md](../spec/views.md)）。宿主没有实现的位置，协商时就会报告出来——标了 `optional: true` 就降级，没标就拒载，总之不会等到运行时才崩溃。
- **排布用 `priority`（`high | normal | low`），不用数字。** 你的插件不需要知道其他插件的存在，宿主按优先级类别统一排列。
- **渲染成什么样子是宿主的事。** 同一个 `conversation.tab`，Web 宿主渲染成页签，TUI 宿主可能渲染成可切换的面板——插件不关心，也不应该关心。

## 第七步：让用户能配置（设置项）

第六步开头那句"方向已定稿、宿主实现还在跟进"，从本步起对每一步都适用，不再重复。

到目前为止，打招呼文案和计数起点都写死在代码里。想让用户自己修改，做法仍然是声明式的：在 manifest 里声明设置的结构，不写任何设置界面——

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

就这些。`schema` 一经声明，宿主就会照着 JSON Schema 自动生成设置表单——标题、输入框、默认值、校验全部包办，**插件一行表单代码都不用写**。这和纯声明视图是同一个道理，也和你第一步就见过的那条规则一脉相承：声明什么，才能用什么。

两个细节：

- **不需要声明新契约。** 设置项复用第六步的 `views.dsh/v1alpha1` 契约，不新增坐标——设置表单本质上是宿主设置页里的一节视图，落在 `settings.section` 这个登记过的 location 上。
- **设置按 namespace 隔离。** 代码通过 settings 句柄读写时，只能访问自己 namespace 下的键，其他插件的设置无法触及——和存储的私有性是同一条纪律。

代码里把写死的值换成读取设置（句柄形态示意，以 spec 定稿为准）：

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

用户在设置页改了文案，下一次 `/hello` 说的就是新的话——你的代码只多了一处读取设置的调用，其余一行没变。

## 第八步：换个皮肤（主题）

这一步一行代码都不用改，只动 manifest。让这个插件顺带贡献一套配色，把界面染成自己的主题色：

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

三条规则，你听完会觉得耳熟：

- **`tokens` 的键只能来自 registry 令牌表里登记的 `--dsw-*` 令牌。** 自造一个 `--hello-green`，第五步那个校验工具当场就会报错——这和"location 只能填登记过的位置"是同一条纪律。
- **宿主同时只激活一套皮肤主题。** 用户启用你的 Hello Mint，其他皮肤就退场，不叠加、不冲突；`dark` 里的覆盖值只在暗色模式下生效。
- **卸载即还原。** 令牌值随主题的启用与停用而来去，卸载或切换之后界面立刻恢复原样——没有残留的样式补丁，不需要 MutationObserver，也不需要为宿主从未承诺过的内部钩子编写自愈代码。皮肤插件过去的那些非常规手段，到此为止。

## 进阶篇：从 Hello World 到"小酒馆"

> **本篇基于 [RFC 0006](../rfcs/0006-host-services.md)（宿主服务能力族，Draft，目标 v0.16）。** 契约坐标与字段布局均为示意，以 registry 定案为准；安装到今天的宿主上，协商报告会如实告诉你哪些契约尚未实现。

前八步的插件只会"被动响应"。热门插件的另一半本领是主动的：自己调用模型、自己定时执行、自己开放接口、自己管理文件。这六件事今天没有标准，每个全功能插件都在各自重复造轮子——审计细节见 [docs-plan.md §8](../docs-plan.md)，RFC 0006 把它们收纳成了契约。接下来六步，把 Hello World 养成一个"迷你小酒馆"：有人设、有记忆文件、有定时任务、有自己的 API。

### 第九步：把记忆写成文件（PluginFiles）

计数放在 LocalStorage 里没有问题，但"记忆"不一样——它应该是一个用户能打开、AI 能在对话里直接修改的文件。声明文件存储契约：

```jsonc
{ "apiVersion": "filestore.dsh/v1alpha1", "kind": "PluginFiles" }
```

```ts
const files = activation.contracts.get(
  { apiVersion: 'filestore.dsh/v1alpha1', kind: 'PluginFiles' }
)

// 写入一律原子化：宿主内部先写临时文件再重命名，你没有非原子的写法可选
await files.writeJson('memory.json', { greeting: 'Hello World', count: 42 })
```

两条规则：

- **目录由宿主分配，路径不用自己拼。** 逻辑位置是 `插件数据根/com.example.hello-dsh/`；物理路径在哪里、home 目录怎么解析，都是宿主的事。过去每个插件都要自己抄一份路径解析逻辑，抄出来还互不一致——那样的日子结束了。
- **和 LocalStorage 的分工只有一条经验法则**：这份数据需不需要以"一个文件"的形态被用户或 AI 直接查看、直接修改？需要，用 PluginFiles；不需要，用 LocalStorage。travel 插件的攻略功能就是这样运转的——AI 在对话里直接修改 `guide.json`，插件重新读取即生效，还附带备份归档。

### 第十步：让 AI 用人设说话（PromptSections）

只有插件自己打招呼还不够，让 AI 也入戏。声明提示词契约，注册一个提示词段：

```jsonc
{ "apiVersion": "prompt.dsh/v1alpha1", "kind": "PromptSections" }
```

```ts
const prompt = activation.contracts.get(
  { apiVersion: 'prompt.dsh/v1alpha1', kind: 'PromptSections' }
)

activation.scope.add(prompt.section({
  name: 'hello-dsh:persona',
  order: -90,                       // 宿主身份（-100）之后、部署人格（0）之前
  text: (context) => {
    if (!isHelloSession(context.sessionId)) return '' // 返回空串 = 本次不注入
    return '你是 Hello World 的狂热布道者，回答时每句话都要提到 Hello World。'
  },
}))
```

三个知识点：

- **`text` 是同步函数**，每次组装系统提示词时重新求值，上下文里可以拿到会话标识。"按会话条件注入"就是函数里的一个 `if`——tavern 用它给不同会话注入不同的角色人格，你可以用它只给满足条件的会话切换人设，背后是同一条契约。
- **`order` 的数值是所有宿主共同遵守的公共刻度**：-100 是宿主身份、0 是部署人格、100–199 是工具指导。写 -90 的意思是"紧跟在宿主身份之后"。
- **函数必须同步、必须幂等。** 它会被反复求值；在里面发网络请求、修改状态，出了问题没有人能帮你诊断。

### 第十一步：让模型自己写文案（LlmAccess）

打招呼文案也可以不写死，交给宿主里配置好的模型现场生成：

```jsonc
{ "apiVersion": "llm.dsh/v1alpha1", "kind": "LlmAccess" }
```

```ts
const llm = activation.contracts.get(
  { apiVersion: 'llm.dsh/v1alpha1', kind: 'LlmAccess' }
)

const [provider] = llm.listProviders()              // 宿主已配置好的 provider
const [model] = await llm.listModels(provider)

let greeting = ''
for await (const chunk of llm.stream({ provider, model, messages: [/* … */] })) {
  if (chunk.type === 'text-delta') greeting += chunk.text
}
```

两点说明：

- **模型由宿主配置，插件只负责使用。** `listProviders` / `listModels` / `stream` 三个方法就是全部调用面。契约刻意不包含"用户当前选中的是哪个模型"——宿主今天没有这个概念，默认路由策略由插件自己决定，tavern 的做法是取第一个 provider 的第一个模型。
- **每次调用都必须可被审计。** 宿主保留对每次调用的审计钩子，用量如实上报；但契约同时写死了一条——**宿主不得用这份用量数据做配额限制**，防止将来某个宿主悄悄加上限制，让依赖模型的插件莫名失效。

### 第十二步：到点自动执行（BackgroundJobs）

每天主动问一次好，不需要用户操作，也不需要开着任何界面。manifest 里声明调度规则，代码里声明触发后做什么：

```jsonc
{ "apiVersion": "jobs.dsh/v1alpha1", "kind": "BackgroundJobs" }
```

```jsonc
"contributes": {
  "jobs": [
    { "id": "com.example.hello-dsh.daily", "schedule": { "every": 86400 } }
  ]
}
```

```ts
const jobs = activation.contracts.get(
  { apiVersion: 'jobs.dsh/v1alpha1', kind: 'BackgroundJobs' }
)

activation.scope.add(
  jobs.onTrigger('com.example.hello-dsh.daily', async () => {
    activation.log.info('Hello World！每日问好')
  })
)
```

为什么调度必须由宿主执行？看看没有这条契约时插件们是怎么活的：task-board 把定时器放在浏览器标签页里，**页面一关，触发就丢**；tavern 在宿主进程里裸写 `setInterval`，没有持久化，也没有任何治理。契约化之后：调度由宿主进程执行、规则持久化保存、宿主重启后补投过期的任务。插件只声明两件事："多久一次"和"触发后做什么"。

### 第十三步：给记忆开放一个 HTTP 接口（WebRoutes）

把记忆通过 HTTP 暴露出来，再挂载一份静态说明页：

```jsonc
{ "apiVersion": "webserver.dsh/v1alpha1", "kind": "WebRoutes" }
```

```ts
const web = activation.contracts.get(
  { apiVersion: 'webserver.dsh/v1alpha1', kind: 'WebRoutes' }
)

activation.scope.add(web.register({
  kind: 'exact',
  path: '/hello-dsh/memory',
  guard: 'loopback',              // 默认档位：只有本机回环请求可达
  handler: async (req, res) => { /* 读取 memory.json，返回 JSON */ },
}))

activation.scope.add(web.serveStatic({
  path: '/hello-dsh/assets',
  root: 'assets',                 // 静态资源走内建助手，路径穿越等防护由宿主负责
}))
```

安全是这条契约的主角，规则只有一条：**门禁选档位，不自己实现。** 每套路由声明一个 `guard`：`loopback`（默认，仅限本机）、`lan-paired`（局域网访问必须持有配对凭证）、`workspace-scoped`（路径必须落在已注册的工作区内）。回环判定、配对校验、realpath 前缀检查、符号链接逃逸防护，全部由宿主实现。过去三个插件各写一套门禁、造出三种不同的漏洞面——那样的局面结束了。

另外一点：处理器允许**长时间保持连接的响应**，SSE（Server-Sent Events）就是这样实现的——想给浏览器推送实时事件，这是当前契约之内的正规做法。

### 第十四步：只订阅关心的消息（SessionFeed）

第三步的 MessageObserver 用来观察消息已经够用。但如果你关心更原始的会话事件——比如统计 token 用量——直接订阅全部事件会被流式片段（chunk，即逐 token 的输出流）淹没。activity 插件实测过：一个会话里 99.4% 的事件是它不需要的逐 token 流，冷启动 100 个会话下载了 157 MB。SessionFeed 把过滤做在源头：

```jsonc
{ "apiVersion": "sessions.dsh/v1alpha1", "kind": "SessionFeed", "optional": true }
```

```ts
const feed = activation.contracts.get(
  { apiVersion: 'sessions.dsh/v1alpha1', kind: 'SessionFeed' }
)

const sub = feed.subscribe(
  {
    types: ['user/message', 'assistant/message'],  // 白名单：名单之外的事件根本不会发出
    since: ((await storage.get('asOfSeq')) as number | undefined) ?? -1, // 从上次进度继续
  },
  (event) => {
    // 把事件累计进你的统计……
    storage.set('asOfSeq', event.seq)              // 记录进度：断线重连后不重复、不遗漏
  }
)
activation.scope.add(() => sub.dispose())
```

类型白名单加进度游标，正是 activity 插件自己摸索出来的那套"摘要 + 增量"方案——插件踩出来的最佳实践，被扶正成了标准能力。如果只关心消息本身，第三步的 MessageObserver 仍然是更省事的选择；这条契约留给需要原始事件或增量同步的场景。

## 终验：照这份文档，能重写"小酒馆"吗？

拿真实的热门插件 dsh-tavern-plugin 逐条对照——它今天的每一项本领，分别对应哪一步、哪条契约：

| 小酒馆今天的本领 | 标准契约 | 本文步骤 | 覆盖 |
| --- | --- | --- | --- |
| 对话区 tab：画廊 / 详情 / 朋友圈 | `views.dsh`（`conversation.tab`） | 第六步 | ✅ |
| 按会话注入角色人格与记忆 | `prompt.dsh` | 第十步 | ✅ |
| 读取会话事件做记忆提取 | `sessions.dsh`（类型过滤 + 游标） | 第十四步 | ✅ |
| 自发调用模型：记忆提取、心跳发文、互评 | `llm.dsh` | 第十一步 | ✅ |
| 15 分钟记忆提取、朋友圈心跳 | `jobs.dsh` | 第十二步 | ✅ |
| 立绘贴纸静态路由 + JSON API | `webserver.dsh` | 第十三步 | ✅ |
| mapping / memory / moments 私有 JSON | `filestore.dsh` | 第九步 | ✅ |
| 画廊行为做成设置项 | `views.dsh` 设置贡献点 | 第七步 | ✅ |
| 浏览器端实时刷新（events.mux） | — | — | ⚠️ 见下 |

结论：**宿主侧的本领，标准 100% 覆盖。** 唯一的缺口在浏览器端实时推送——Node 半区到浏览器半区的事件通道还没有契约（[RFC 0006](../rfcs/0006-host-services.md) 开放问题 5，与 RFC 0002 合流时定案）。过渡期有正规做法：用第十三步 WebRoutes 的长连接响应自建 SSE，完全在契约之内，不需要任何非常规手段。

## 回头看一眼

十四步走完，这个插件接触过的全部东西：一份静态 JSON、一个 `defineFacet`、三面上下文（`extensions` / `contracts` / `scope`）、十一条 registry 契约（commands、storage、messages、views、themes、filestore、prompt、llm、jobs、webserver、sessions——设置项复用 views 契约，不新增坐标）。没有 patch，没有反射探测，没有调用任何宿主内部函数。这就是它能穿越 dsh 上游更新周期的原因——它依赖的是契约，不是实现；官方修改内部实现时，变化由 SDK 适配层吸收，插件零感知。

想写真正的插件，接着读[插件作者指南](plugin-author.md)；从 patch 流派迁移过来的，直接读[迁移指南](migration.md)。

## 关联

- [spec/facet-api.md](../spec/facet-api.md) —— `defineFacet` 与三面上下文的逐条签名（草案）
- [spec/manifest.md](../spec/manifest.md) —— manifest 逐字段权威定义
- [spec/views.md](../spec/views.md) —— `contributes.views` 与设置贡献点（草案）
- [spec/themes.md](../spec/themes.md) —— `contributes.themes` 与 `--dsw-*` 令牌表（草案）
- [registry/](../registry/README.md) —— 契约坐标的机器可读条目
- [插件作者指南](plugin-author.md) —— 声明/绑定纪律、协商报告与报错对照
- [RFC 0005](../rfcs/0005-declarative-views.md) —— 第六到八步视图、设置、主题贡献点的标准本体
- [RFC 0006](../rfcs/0006-host-services.md) —— 第九到十四步宿主服务能力族的标准本体（Draft）
