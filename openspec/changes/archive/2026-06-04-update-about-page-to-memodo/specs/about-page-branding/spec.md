## ADDED Requirements

### Requirement: About page displays Memodo branding
The About page SHALL display the project name "Memodo" instead of "Memos" in the header section.

#### Scenario: About page renders with Memodo name
- **WHEN** a user navigates to the About page
- **THEN** the main heading displays "Memodo"
- **AND** the page description references Memodo as an open-source note-taking tool

### Requirement: About page uses fork-relevant project links
The About page SHALL link to the fork's GitHub repository (`github.com/iridesc/memos`) and SHALL NOT link to upstream `usememos.com` or `github.com/usememos/memos`.

#### Scenario: GitHub link points to fork
- **WHEN** the About page renders
- **THEN** a GitHub link button is present
- **AND** the link targets `https://github.com/iridesc/memos`

#### Scenario: No upstream website or docs links
- **WHEN** the About page renders
- **THEN** no link to `usememos.com` is present
- **AND** no link to `usememos.com/docs` is present

### Requirement: About page tagline reflects Memodo
The About page SHALL display a tagline appropriate for the Memodo project, replacing the upstream "Capture first. Keep it yours."

#### Scenario: Memodo tagline is displayed
- **WHEN** a user views the About page
- **THEN** a brief descriptive tagline for Memodo is shown beneath the project name

### Requirement: Product points reflect Memodo
The About page SHALL display product description points that reflect Memodo's identity as a self-hosted note-taking and todo management tool.

#### Scenario: Product points are displayed
- **WHEN** the About page renders the Product section
- **THEN** product description items are shown
- **AND** the items describe Memodo's capabilities (notes, todos, self-hosted, Markdown-native)

### Requirement: Upstream sponsors are not displayed
The About page SHALL NOT display upstream Memos sponsors (CodeRabbit, Warp).

#### Scenario: Sponsors section is absent
- **WHEN** a user views the About page
- **THEN** no sponsor logos or links from upstream Memos are present

### Requirement: Birds section is preserved
The About page SHALL retain the "Birds" section displaying pixel tile sprites used in empty states.

#### Scenario: Birds section renders
- **WHEN** the About page renders
- **THEN** the Birds section is present with pixel sprite tiles
- **AND** each tile displays its sprite name
