## Why

已完成状态的 memo 需要手动归档，长期积累后列表中的已完成 memo 越来越多，增加用户管理负担。自动归档功能可在用户设定的时间后自动将已完成 memo 转为归档状态，减少手动操作，保持列表整洁。

## What Changes

- 新增用户级设置 `AUTO_ARCHIVE`，允许用户在个人中心开启/关闭自动归档，并配置归档天数（默认 15 天）
- 新增后台定时任务，定期扫描所有用户的已完成 memo，将超过设定天数的 memo 自动转为 ARCHIVED 状态
- 在个人设置（Preferences）页面新增「自动归档」配置区域

## Capabilities

### New Capabilities
- `auto-archive`: 用户可配置的自动归档功能，已完成 memo 在指定天数后自动转为归档状态

### Modified Capabilities
- `memo-completed-state`: COMPLETED → ARCHIVED 转换增加自动化路径，不再仅依赖手动操作

## Impact

- **Proto**: `store/user_setting.proto` 新增 `AUTO_ARCHIVE` 的 `UserSetting.Key` 枚举值和对应的 setting message
- **Proto**: `api/v1/user_service.proto` 新增对应的 API 层 setting 类型
- **Backend**: 新增 `server/runner/autoarchive/` runner，注册到 `server/server.go` 的后台任务启动流程中
- **Store**: 新增根据 `RowStatus=COMPLETED` 和 `UpdatedTs` 查询 memo 的支持（现有 `FindMemo` 已支持 `RowStatus` 筛选）
- **Frontend**: Preferences 设置页新增自动归档配置 UI
- **i18n**: 新增自动归档相关的翻译 key
