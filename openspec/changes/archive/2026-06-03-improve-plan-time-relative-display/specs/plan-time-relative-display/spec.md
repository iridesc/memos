## ADDED Requirements

### Requirement: Plan time displayed with three-state relative format

The system SHALL classify memo plan time into three states and display each distinctly:

| State | Condition | Display format |
|-------|-----------|---------------|
| Not started | `plan_start_time` in the future | "`<time>`后开始 · 持续`<duration>`" |
| In progress | `plan_start_time` in the past, `plan_end_time` in the future | "进行中 · `<time>`后结束" |
| Expired | Both `plan_start_time` and `plan_end_time` in the past | "已过期" |

The system SHALL use the single largest appropriate time unit with one decimal place (e.g., "1.5小时后", "30分钟后").

Time unit thresholds:
- 0–59 minutes: display in whole minutes (no decimal needed)
- 60 minutes – 23.9 hours: display in hours with up to 1 decimal place
- 24 hours – 29.9 days: display in days with up to 1 decimal place
- ≥ 30 days: display in months with up to 1 decimal place

The system SHALL strip trailing ".0" from decimal values (e.g., "2.0小时后" → "2小时后").

The system SHALL support internationalization for all displayed text.

#### Scenario: Plan not started (future)

- **WHEN** memo has `plan_start_time` and `plan_end_time` both set, and `plan_start_time` is in the future
- **THEN** MemoHeader displays "`<time>`后开始 · 持续`<duration>`" with single largest unit and optional decimal

#### Scenario: Plan in progress (started but not ended)

- **WHEN** memo has `plan_start_time` in the past and `plan_end_time` in the future
- **THEN** MemoHeader displays "进行中 · `<time>`后结束" showing remaining time until end, omitting how long ago it started

#### Scenario: Plan expired (both in past)

- **WHEN** memo has `plan_start_time` and `plan_end_time` both in the past
- **THEN** MemoHeader displays "已过期" (or equivalent), with no time values — signaling the task needs manual archiving

#### Scenario: Plan is imminent (less than 60 seconds away)

- **WHEN** memo has `plan_start_time` less than 60 seconds in the future (not yet started)
- **THEN** MemoHeader displays "即将开始 · 持续`<duration>`" (or equivalent)

#### Scenario: In-progress plan ending soon (less than 60 seconds remaining)

- **WHEN** memo is in progress and `plan_end_time` is less than 60 seconds in the future
- **THEN** MemoHeader displays "进行中 · 即将结束" (or equivalent)

#### Scenario: Plan time not set

- **WHEN** memo does not have `plan_start_time` or `plan_end_time` set
- **THEN** MemoHeader does not display any plan time information

#### Scenario: Decimal precision

- **WHEN** time difference is 90 minutes
- **THEN** the display shows "1.5小时" (not "1小时30分钟" or "90分钟")

#### Scenario: Whole number strips decimal

- **WHEN** time difference is exactly 2 hours (120 minutes)
- **THEN** the display shows "2小时" (not "2.0小时")

### Requirement: Creation/update time removed from card display

The system SHALL NOT display creation time or update time as text on the memo card header. The memo card header SHALL only show:
- Creator avatar and name (when enabled)
- Plan time (when set, in relative format)

All precise timestamps (created, updated, plan start, plan end) SHALL remain accessible via hover tooltip.

#### Scenario: Memo with plan time

- **WHEN** memo has plan time set
- **THEN** card header shows creator (if enabled) and relative plan time; no creation time text

#### Scenario: Memo without plan time

- **WHEN** memo does not have plan time set
- **THEN** card header shows only creator (if enabled); no time text visible

### Requirement: Absolute times preserved in tooltip

The system SHALL continue to display absolute plan start and end times in the hover tooltip, formatted as full localized date-time strings.

#### Scenario: Hover tooltip shows absolute times

- **WHEN** user hovers over the relative plan time display
- **THEN** tooltip shows the exact plan start and plan end date-time in localized format
