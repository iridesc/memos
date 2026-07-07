## 1. 前端实现

- [x] 1.1 修改 `web/src/components/MemoView/components/MemoHeader.tsx` 的 `PlanTimeDisplay` 组件，在已完成状态下将 `updateTime` 的日期显示在「已完成」标签后
- [x] 1.2 添加相关 i18n 翻译 key（无需新增，复用已有 key）

## 2. 验证

- [x] 2.1 前端 lint/type check 通过：`cd web && pnpm lint`
- [ ] 2.2 启动服务，手动验证：标记 memo 为完成时卡片头部显示完成时间
