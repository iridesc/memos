## 1. Proto 定义

- [x] 1.1 在 `proto/api/v1/memo_service.proto` 的 `Memo` 消息中新增 `plan_start_time` (field 19) 和 `plan_end_time` (field 20)，类型为 `google.protobuf.Timestamp`，标注 `OPTIONAL`
- [x] 1.2 更新 `ListMemosRequest.order_by` 字段注释，将 `plan_start_time` 和 `plan_end_time` 加入支持的排序字段列表
- [x] 1.3 运行 `buf generate` 生成 Go 和 TypeScript 代码

## 2. 数据库 Migration

- [x] 2.1 创建 `store/migration/sqlite/0.29/00__memo_plan_times.sql`：`ALTER TABLE memo ADD COLUMN plan_start_ts BIGINT DEFAULT NULL; ALTER TABLE memo ADD COLUMN plan_end_ts BIGINT DEFAULT NULL;`
- [x] 2.2 创建 `store/migration/postgres/0.29/00__memo_plan_times.sql`：同上（PostgreSQL 语法无差异）
- [x] 2.3 创建 `store/migration/mysql/0.29/00__memo_plan_times.sql`：`` ALTER TABLE `memo` ADD COLUMN `plan_start_ts` BIGINT DEFAULT NULL; ALTER TABLE `memo` ADD COLUMN `plan_end_ts` BIGINT DEFAULT NULL; ``
- [x] 2.4 更新 `store/migration/sqlite/LATEST.sql` 的 `CREATE TABLE memo`，新增 `plan_start_ts BIGINT DEFAULT NULL` 和 `plan_end_ts BIGINT DEFAULT NULL` 列
- [x] 2.5 更新 `store/migration/postgres/LATEST.sql` 的 `CREATE TABLE memo`，新增对应列
- [x] 2.6 更新 `store/migration/mysql/LATEST.sql` 的 `CREATE TABLE memo`，新增对应列

## 3. Store 层

- [x] 3.1 在 `store/memo.go` 的 `Memo` 结构体中新增 `PlanStartTs *int64` 和 `PlanEndTs *int64` 字段
- [x] 3.2 在 `store/memo.go` 的 `UpdateMemo` 结构体中新增 `PlanStartTs *int64` 和 `PlanEndTs *int64` 字段
- [x] 3.3 在 `store/memo.go` 的 `FindMemo` 结构体中新增 `OrderByPlanStart bool` 和 `OrderByPlanEnd bool` 字段
- [x] 3.4 更新 `store/db/sqlite/memo.go`：SELECT 列列表、CREATE 写入、UPDATE 写入、ORDER BY 构建逻辑中支持新字段
- [x] 3.5 更新 `store/db/postgres/memo.go`：同上
- [x] 3.6 更新 `store/db/mysql/memo.go`：同上

## 4. API 层

- [x] 4.1 在 `server/router/api/v1/memo_service_converter.go` 中新增 `convertPlanStartTimeFromStore` 和 `convertPlanEndTimeFromStore` 函数（`*int64` → `*timestamppb.Timestamp`）
- [x] 4.2 在 `memo_service_converter.go` 中新增 `convertPlanStartTimeToStore` 和 `convertPlanEndTimeToStore` 函数（`*timestamppb.Timestamp` → `*int64`）
- [x] 4.3 在 `server/router/api/v1/memo_service.go` 的 `CreateMemo` handler 中处理 `plan_start_time` 和 `plan_end_time` 字段
- [x] 4.4 在 `memo_service.go` 的 `UpdateMemo` handler 中新增 `plan_start_time` 和 `plan_end_time` 的 `update_mask` 路径处理
- [x] 4.5 在 `memo_service.go` 的 `parseMemoOrderBy` 函数中新增 `"plan_start_time"` 和 `"plan_end_time"` case 分支

## 5. 前端类型与数据层

- [x] 5.1 确认 `buf generate` 生成的 `web/src/types/proto/api/v1/memo_service_pb.ts` 包含 `planStartTime` 和 `planEndTime` 字段
- [x] 5.2 在 `web/src/components/MemoView/MemoViewContext.tsx` 的 `useMemoViewDerived` 中新增 `planStartTime` 和 `planEndTime` 派生值（Timestamp → Date 转换）
- [x] 5.3 在 `web/src/hooks/useMemoSorting.ts` 中新增 `plan_start_time` 和 `plan_end_time` 的 `orderBy` 字符串生成逻辑
- [x] 5.4 在 `web/src/contexts/ViewContext.tsx` 中扩展 `MemoTimeBasis` 类型，新增 `"plan_start_time"` 和 `"plan_end_time"` 选项，并确保 localStorage 兼容性

## 6. 前端 UI —— Memo 卡片展示

- [x] 6.1 在 `web/src/components/MemoView/components/MemoHeader.tsx` 中新增计划时间展示区域：创建时间旁边渲染计划时间范围
- [x] 6.2 实现展示逻辑：两个时间都存在 → `📅 开始 ~ 结束`；仅开始 → `📅 从 开始`；仅结束 → `📅 截止于 结束`；都不存在 → 不渲染
- [x] 6.3 为计划时间展示区域添加 hover tooltip，显示完整日期时间

## 7. 前端 UI —— 排序设置

- [x] 7.1 在 `web/src/components/MemoDisplaySettingMenu.tsx` 中将「显示时间」下拉改为排序字段选择器，选项扩展为：创建时间、更新时间、计划开始时间、计划结束时间
- [x] 7.2 确保排序变更后 memo 列表正确重新请求并渲染

## 8. 前端 UI —— 编辑器计划时间选择器

- [x] 8.1 在编辑器底部元数据区新增计划时间按钮（日历图标），点击弹出日期时间选择器弹窗
- [x] 8.2 实现日期时间选择器弹窗：分别选择开始日期时间和结束日期时间，支持清除
- [x] 8.3 将选择的计划时间写入 `CreateMemo` / `UpdateMemo` 请求中（通过 `update_mask` 正确传递）

## 9. 验证与收尾

- [x] 9.1 运行 `go test ./...` 确保后端测试通过 (gofmt syntax check passed; dependency download blocked by network)
- [x] 9.2 运行 `cd web && pnpm lint` 确保前端类型检查和 lint 通过
- [x] 9.3 运行 `buf lint` 确保 proto 文件合规
- [x] 9.4 手动验证：创建带计划时间的 memo → 列表按计划时间排序 → 卡片正确展示 → 编辑器设置/清除计划时间
