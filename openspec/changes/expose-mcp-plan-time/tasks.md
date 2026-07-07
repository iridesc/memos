## 1. memoJSON 响应增加计划时间和完成状态

- [ ] 1.1 `memoJSON` 结构体增加 `PlanStartTime *int64` 和 `PlanEndTime *int64` 字段，json tag 为 `plan_start_time,omitempty` 和 `plan_end_time,omitempty`
- [ ] 1.2 `storeMemoToJSON` 中从 `m.PlanStartTs` / `m.PlanEndTs` 填入值
- [ ] 1.3 `parseRowStatus` 函数加上 `store.Completed` 分支

## 2. create_memo 工具增加计划时间参数

- [ ] 2.1 `registerMemoTools` 中 `create_memo` 工具定义增加 `mcp.WithNumber("plan_start_time")` 和 `mcp.WithNumber("plan_end_time")` 可选参数
- [ ] 2.2 `handleCreateMemo` handler 解析 `plan_start_time` / `plan_end_time` 参数并设置到创建请求中

## 3. update_memo 工具增加计划时间和完成状态参数

- [ ] 3.1 `registerMemoTools` 中 `update_memo` 工具定义增加 `mcp.WithNumber("plan_start_time")` 和 `mcp.WithNumber("plan_end_time")` 可选参数
- [ ] 3.2 `handleUpdateMemo` handler 解析 `plan_start_time` / `plan_end_time` 参数并设置到更新请求中（传 0 表示清除）
- [ ] 3.3 `handleUpdateMemo` handler 支持 `state` 设为 `COMPLETED` 的解析和传递

## 4. 测试

- [ ] 4.1 更新 `mcp_test.go`，增加测试用例覆盖：有计划时间的 memo 读取、COMPLETED 状态映射
- [ ] 4.2 增加测试用例覆盖：create memo 带计划时间、update memo 修改计划时间
- [ ] 4.3 运行 `go test -v ./server/router/mcp/...` 确认全部通过
