## 1. Proto: Store 层定义

- [ ] 1.1 在 `proto/store/user_setting.proto` 的 `UserSetting.Key` 枚举中新增 `AUTO_ARCHIVE = 8`
- [ ] 1.2 在 `proto/store/user_setting.proto` 中新增 `AutoArchiveUserSetting` 消息（`enabled bool`, `archive_after_days int32`）
- [ ] 1.3 在 `proto/store/user_setting.proto` 的 `UserSetting.value` oneof 中新增 `auto_archive` 字段

## 2. Proto: API 层定义

- [ ] 2.1 在 `proto/api/v1/user_service.proto` 的 `UserSetting.Key` 枚举中新增 `AUTO_ARCHIVE = 8`
- [ ] 2.2 在 `proto/api/v1/user_service.proto` 中新增 `UserSetting.AutoArchiveSetting` 的 oneof 值和对应消息
- [ ] 2.3 运行 `buf generate` 重新生成 Go 和 TypeScript 代码
- [ ] 2.4 更新 `proto/gen/store/user_setting.pb.go` 的 `OneofWrappers` 注册（或通过 `buf generate` 自动生成）

## 3. Backend: Store 层反序列化支持

- [ ] 3.1 确认 `store/user_setting.go` 的 `convertUserSettingToRaw`/`convertUserSettingFromRaw` 无需修改（Key 和 Value 由 proto 自动处理）

## 4. Backend: API 层 Setting 转换

- [ ] 4.1 在 `server/router/api/v1/user_service.go` 的 `convertUserSettingFromStore` 中新增 `AUTO_ARCHIVE` 的转换逻辑
- [ ] 4.2 在 `server/router/api/v1/user_service.go` 的 `convertUserSettingToStore` 中新增 `AUTO_ARCHIVE` 的转换逻辑

## 5. Backend: 自动归档 Runner

- [ ] 5.1 新建 `server/runner/autoarchive/runner.go`，实现 `Runner` struct（`Run`, `RunOnce` 方法）
- [ ] 5.2 `RunOnce` 中实现核心逻辑：遍历所有用户 → 检查 AUTO_ARCHIVE 设置 → 查询过期 COMPLETED memo → 批量更新为 ARCHIVED
- [ ] 5.3 在 `server/server.go` 的 `startBackgroundRunners()` 中注册 `autoarchive.Runner`

## 6. Frontend: TypeScript 类型

- [ ] 6.1 确认 `buf generate` 后 `web/src/types/proto/store/` 和 `web/src/types/proto/api/v1/user_service_pb.ts` 中已包含 `AUTO_ARCHIVE` 相关类型

## 7. Frontend: 设置 UI

- [ ] 7.1 在 `web/src/components/Settings/PreferencesSection.tsx` 中新增自动归档配置组（开关 + 天数输入）
- [ ] 7.2 添加自动归档相关的 i18n 翻译 key（`setting.auto-archive.*`）

## 8. 验证

- [ ] 8.1 编译后端：`go build ./...`
- [ ] 8.2 编译前端：`pnpm typecheck && pnpm lint`
- [ ] 8.3 启动服务验证自动归档功能
