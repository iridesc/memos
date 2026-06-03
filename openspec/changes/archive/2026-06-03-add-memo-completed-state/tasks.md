## 1. Proto & Store 层

- [x] 1.1 在 `proto/api/v1/common.proto` 的 `State` 枚举中新增 `COMPLETED = 3`，运行 `buf generate`
- [x] 1.2 在 `store/common.go` 中新增 `Completed RowStatus = "COMPLETED"` 常量
- [x] 1.3 修改 `server/router/api/v1/memo_service.go` 中 `ListMemos` 的 `state` 过滤逻辑：默认（NORMAL）时同时返回 `NORMAL` 和 `COMPLETED`
- [x] 1.4 更新 `server/router/api/v1/common.go` 中 `convertStateFromStore`/`convertStateToStore` 映射

## 2. 数据库 Migration

- [x] 2.1 创建 SQLite migration：扩展 `row_status` CHECK 约束为 `('NORMAL','COMPLETED','ARCHIVED')`
- [x] 2.2 创建 MySQL migration：ALTER TABLE 修改 CHECK 约束
- [x] 2.3 创建 PostgreSQL migration：ALTER TABLE 修改 CHECK 约束
- [x] 2.4 更新 `store/migration/sqlite/LATEST.sql` 中的 CHECK 约束定义

## 3. 后端 API 适配

- [x] 3.1 调整 `ListMemos` 中 `state=NORMAL` 的查询逻辑：`WHERE row_status IN ('NORMAL', 'COMPLETED')`
- [x] 3.2 调整 `ListMemos` 中 `state=COMPLETED` 的查询：仅返回 `row_status = 'COMPLETED'`
- [x] 3.3 确保 `UpdateMemo` 的 `state` 更新逻辑支持 COMPLETED（无需额外改动，验证现有机制即可）
- [x] 3.4 确保 `GetMemo` 的 `checkMemoReadAccess` 对 COMPLETED memo 不返回 404（COMPLETED memo 可见性与 NORMAL 一致）

## 4. 前端列表分组

- [x] 4.1 在 `PagedMemoList` 中按 `state` 分组 memo：`activeMemos`（NORMAL）和 `completedMemos`（COMPLETED）
- [x] 4.2 创建 `CompletedSection` 组件：折叠条（默认收起）+ 折叠偏好持久化到 localStorage
- [x] 4.3 已完成区使用与活跃区相同的排序逻辑和筛选条件
- [x] 4.4 已完成 memo 取消完成时，memo 立即从已完成区移动到活跃区（通过 React Query 缓存更新）

## 5. 前端完成勾选框

- [x] 5.1 在 `MemoView` 卡片右下角添加完成勾选框组件（空心/实心 CircleCheck 图标），仅当 `planStartTime && planEndTime && !isArchived` 时展示
- [x] 5.2 点击勾选框调用 `updateMemo({ update: { name, state }, updateMask: ["state"] })`，成功时 toast 提示
- [x] 5.3 适配 `MemoActionMenu`：COMPLETED 状态 memo 的菜单项调整（保留 Archive/Restore/Delete，禁用 Edit/Copy 等）

## 6. 国际化

- [x] 6.1 在 `web/src/locales/en.json` 中新增 completion 相关翻译键
- [x] 6.2 在 `web/src/locales/zh-Hans.json` 中新增中文翻译

## 7. 验证

- [x] 7.1 运行 `go test ./...` 确保后端测试通过
- [x] 7.2 运行 `pnpm lint` 确保前端无类型/格式错误
- [x] 7.3 手动测试：完成勾选、取消勾选、折叠区展开/收起、归档已完成 memo、恢复已归档 memo