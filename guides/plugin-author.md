# 插件作者指南（Plugin Author Guide）

> **优先级：P1 ｜ 状态：骨架占位（待撰写）**
> **本文非规范，冲突以 spec/ 为准。** 规范可以严肃，指南必须说人话。

## 写作提纲

- [ ] 十分钟上手：写一份 manifest → 声明依赖 → `defineFacet` 写一个 command → 本地跑校验器 → 看协商报告
- [ ] 常见拒载报错对照表（报错原文 → 是什么意思 → 怎么改）
- [ ] 重点讲清楚：**为什么不能再 patch 了、标准路径分别对应你以前的哪种野路子**
  - 内部事件名 → `messages.dsh/v1alpha1`（MessageObserver）
  - 往宿主目录写文件 → `storage.dsh/v1alpha1`（LocalStorage）
  - patch UI 注册命令 → `commands.dsh/v1alpha1` + `contributes.commands`
- [ ] 哪些需求标准暂时接不住，诚实指向延期 RFC（UI / 插件间服务 / 网络与文件系统能力）

## 关联

- [spec/manifest.md](../spec/manifest.md)、[registry/](../registry/README.md)、[迁移指南](migration.md)
