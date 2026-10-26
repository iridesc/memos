## ADDED Requirements
### Requirement: Period views
The calendar SHALL provide month/week switching, previous/next period navigation, and a return-to-today action. It SHALL respect local dates and the instance week-start setting.
#### Scenario: Month to week
- **WHEN** the user selects week view
- **THEN** seven consecutive dates containing the selected anchor date appear
### Requirement: Daily planned counts
The calendar SHALL count each personal non-archived scheduled memo once on every date covered by its plan interval, including completed memos and the deadline date.
#### Scenario: Cross-day item
- **WHEN** a memo starts on one date and ends on a later date
- **THEN** every covered date includes that memo once
#### Scenario: Multiple result pages
- **WHEN** the matching query has more than one page
- **THEN** all pages are loaded before final counts are shown
### Requirement: Date drilldown
Each date SHALL open a list of that day's items with detail links and an empty state when there are no items.
#### Scenario: Open an item
- **WHEN** the user clicks an item in the date dialog
- **THEN** its memo detail route opens
### Requirement: Accessible heat display
Dates SHALL show both numeric counts and workload color, with accessible date/count labels. Loading and errors SHALL be explicit and errors SHALL offer retry.
#### Scenario: Small viewport
- **WHEN** the viewport is 320px wide
- **THEN** month/week controls, seven-column date grid, and date dialog remain usable without horizontal overflow
