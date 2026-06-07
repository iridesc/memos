# Tag Tree Default View

## Purpose

Define the default display behavior for the tags sidebar in Memodo. Tags organized with `/` path separators (e.g., `project/frontend`) SHALL default to a hierarchical tree view with auto-expanded nodes, giving users immediate visibility into their tag hierarchy without requiring manual configuration.

## Requirements

### Requirement: Tag tree view is the default display mode
The tag sidebar SHALL display tags in a hierarchical tree view by default, rather than a flat list. The user's existing preference stored in localStorage SHALL take precedence over this default. The tree view toggle in the popover menu SHALL remain functional, allowing users to switch back to flat view at any time.

#### Scenario: First-time user sees tree view
- **WHEN** a user opens the application for the first time (no `tag-view-as-tree` key in localStorage)
- **THEN** the tags sidebar displays tags as a hierarchical tree using `/` as the path separator

#### Scenario: Existing user with flat view preference keeps flat view
- **WHEN** a returning user has `tag-view-as-tree` set to `false` in localStorage
- **THEN** the tags sidebar continues to display tags in flat list mode

#### Scenario: User toggles from tree to flat view
- **WHEN** a user opens the tag options popover and toggles "Tree mode" off
- **THEN** the tags sidebar switches to flat list mode, and the preference is persisted to localStorage

### Requirement: Tag tree nodes are auto-expanded by default
When viewing tags in tree view, all child nodes SHALL be expanded (visible) by default. The user's existing localStorage preference SHALL take precedence. The auto-expand toggle in the popover menu SHALL remain functional.

#### Scenario: First-time user sees all tree nodes expanded
- **WHEN** a user opens the application for the first time (no `tag-tree-auto-expand` key in localStorage) and tags display in tree mode
- **THEN** all hierarchical tag nodes with children are expanded, showing the full tag tree

#### Scenario: Existing user with collapsed preference keeps nodes collapsed
- **WHEN** a returning user has `tag-tree-auto-expand` set to `false` in localStorage
- **THEN** tag tree nodes default to collapsed, requiring manual expansion

#### Scenario: User toggles auto-expand off
- **WHEN** a user opens the tag options popover and toggles "Auto expand" off
- **THEN** tag tree nodes collapse, and the preference is persisted to localStorage
