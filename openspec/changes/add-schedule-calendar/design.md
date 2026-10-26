## Context
Memos have planned start/end timestamps. Existing activity calendars count creation activity and do not represent scheduled workload. The user confirmed that the new module should use plan times.

## Decisions
Use an authenticated personal calendar route without the memo explorer sidebar. Respect the instance's first weekday and local timezone. Month mode includes adjacent dates to complete week rows; week mode displays seven dates. Store the period and mode in URL query parameters so returning from details restores the view.

Query the creator's NORMAL/COMPLETED memos whose intervals overlap the visible grid. Fetch every page with cancellation before publishing counts; reuse the memo-list cache prefix for existing mutation/SSE invalidation. Each unique memo counts once per local date touched by its plan interval, including its deadline date. Exclude unscheduled and archived memos.

Use fixed count bands (0, 1, 2–3, 4–6, 7+) so intensity is comparable across periods; display numeric counts and accessible date/count labels as well as color. Date buttons open an accessible scrollable dialog, including empty dates. Links go directly to memo details. Show loading/error/retry rather than misleading zero counts.

## Tradeoffs
Full pagination is suitable for typical personal workloads but large schedules may eventually benefit from a server-side aggregation endpoint. Avoid new calendar dependencies.
