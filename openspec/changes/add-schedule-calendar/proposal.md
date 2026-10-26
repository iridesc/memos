## Why
Users need an overview of daily planned workload and a direct path from a date to its scheduled items.

## What Changes
- Add an authenticated Calendar navigation entry and page.
- Switch between month/week views, navigate periods, and return to today.
- Display counts and heat intensity for each date.
- Open the day's item list in a dialog with links to memo details.

## Capabilities
### New Capabilities
- `schedule-calendar`: Calendar overview of planned memo intervals.

## Impact
Frontend route, navigation, query hook, date utilities and translations. Uses existing ListMemos with full pagination; no backend or database changes.
