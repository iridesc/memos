## REMOVED Requirements
### Requirement: 拖拽排序
**Reason**: 整卡拖拽影响手机滚动和文本选择。
**Migration**: 使用三个点菜单中的上移、下移，保留已有 today_order 数据，不再通过排序修改计划时间。

## MODIFIED Requirements
### Requirement: 计划截止时间排序
Today 页面 SHALL 使用服务端 `orderBy: "today_order"` 保存用户手动顺序，完成项仍按完成时间倒序展示。

#### Scenario: 手动调整后的顺序
- **WHEN** 用户通过菜单上移或下移一条未完成笔记并刷新页面
- **THEN** 顺序保持，计划开始和结束时间不变

#### Scenario: 不受全局排序设置影响
- **WHEN** 用户改变全局时间排序设置
- **THEN** Today 页面继续使用 `today_order`
