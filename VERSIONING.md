# 版本与契约坐标（Versioning）

> **优先级：P0 ｜ 状态：骨架占位（待撰写）**
> 来源：v0.15 正文 §3.2 + §4.3。这是整个标准最容易被搞混的地方，值得单独一份。

## 写作提纲

- [ ] **六个版本维度**及各自含义，不许混成一个字段：
  1. 插件自身 `version`
  2. `manifestVersion`（manifest 结构）
  3. facet `apiVersion`（要求的 Host API 范围）
  4. 各领域契约版本（v0.15 起随契约坐标独立演进）
  5. 宿主产品版本
  6. SDK 发布版本
- [ ] 契约坐标规则：`apiVersion + kind`（如 `commands.dsh/v1alpha1`）
- [ ] `v1alpha1` 的语义：实验期、可能 breaking、不伪装稳定 `1.x`；v0 阶段按"minor 可能 breaking"的实验规则明确标注
- [ ] breaking change 规则与弃用窗口
- [ ] `x-org.*` 私有命名空间规则
- [ ] 官方保留命名空间（未来官方能力可直接以一等身份入驻）

## 关键论据（写作时展开）

- 为什么要契约独立版本化：Model Provider、工具渐进式披露等领域被上游模型生态推着跑，演进极快，中心化的固定 SDK 扛不住；某领域升级时，只有那份契约和用它的插件需要动，内核、无关插件和宿主都不用重新发版。
- 已有独立探索实现验证：[Yan-Zero/dsh-std](https://github.com/Yan-Zero/dsh-std)。
