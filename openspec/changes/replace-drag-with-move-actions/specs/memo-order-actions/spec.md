## ADDED Requirements
### Requirement: Explicit movement
The Today list SHALL offer move up/down in writable active memo menus and SHALL persist the resulting order without changing plan timestamps.
#### Scenario: Adjacent move
- **WHEN** the user moves a memo up or down
- **THEN** it moves one position in the active sequence and retains that order after refresh
#### Scenario: Boundaries
- **WHEN** a memo is the first or last active item
- **THEN** the corresponding unavailable direction is disabled
#### Scenario: Pending and failure
- **WHEN** a move is saving or fails
- **THEN** concurrent moves are blocked, failures are displayed and canonical ordering is restored
### Requirement: No drag interactions
The application SHALL remove memo sorting by dragging and editor file drop upload, while retaining picker and paste uploads.
#### Scenario: Touch scrolling
- **WHEN** the user scrolls over a memo card
- **THEN** no sorting drag is initiated
### Requirement: Responsive time toolbar
The editor SHALL keep save/cancel actions visible and the time popup within narrow viewports.
#### Scenario: Mobile editing
- **WHEN** the viewport is 320 pixels wide and a plan range is set
- **THEN** toolbar controls wrap without horizontal overflow or clipped action text
