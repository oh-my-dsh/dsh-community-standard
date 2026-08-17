# Spec: Facet 对象模型（Facet Model）

> **优先级：P1 ｜ 状态：骨架占位（待撰写）**

<!-- 固定结构：适用范围 → 规范性定义 → 示例 → 错误与边界情况 → fixtures 清单 → 变更记录 -->

## 写作提纲

- [ ] 四级模型的规范定义：**Component**（分发包，一个 `dsh-plugin.json` 对应一个）→ **Facet**（分面：插件在某个位置的分身）→ **Activation**（一次激活：生命周期与清理的作用域）→ **Participant**（协商实体：与 Broker 谈 requires/supports 的代表）
- [ ] 动机数据：调研样本 12 个插件里 9 个同时需要宿主侧逻辑和客户端呈现——跨面是常态不是特例
- [ ] **v0.15 只规范 `host` facet 的完整契约**：entry 位置、模块格式、执行环境
- [ ] `client` / `worker` 保留名及其归属：[RFC 0002](../rfcs/0002-runtime-presentation.md)
- [ ] `defineFacet` 上下文的最小 API 面：`extensions.publish`、`scope.add`、协商后的能力注入
- [ ] 参考示例引用：[dsh-codex 重构分支](https://github.com/Yan-Zero/dsh-codex/tree/agent/std-facet-runtime)

## 参考代码形态（v0.15 §3.3，撰写时校对后保留）

```ts
export default defineFacet(activation => {
  activation.extensions.publish(
    { apiVersion: 'commands.dsh/v1alpha1', kind: 'Command' },
    'codex', commandHandler)
  activation.scope.add(() => commandHandler.dispose())
})
```

插件只依赖标准 Facet 上下文，不碰宿主私有 API，不被特定运行时绑死。
