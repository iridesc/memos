# Tag Auto-Insert on Create

## Purpose

When creating a new memo while a single tag filter is active, automatically pre-fill the tag in the editor content when the user focuses the editor. This reduces keystrokes while preserving full user control — the inserted tag is plain text that can be freely deleted or modified.

## Requirements

### Requirement: Auto-insert active tag on editor focus
When the editor gains focus in new-memo create mode, the content is empty, and exactly one `tagSearch` filter is active, the system SHALL insert `#tagname ` at the beginning of the content. The inserted tag SHALL be plain text that the user can freely delete or modify.

#### Scenario: Single tag filter, focus empty editor
- **WHEN** a user focuses the new-memo editor, content is empty, and exactly one tag filter (e.g., `project`) is active
- **THEN** `#project ` is inserted at the beginning of the content

#### Scenario: Switch tag and re-focus after clearing
- **WHEN** a user clears the editor content, switches to a different single tag filter, and focuses the editor again
- **THEN** the new tag (e.g., `#newtag `) is inserted

#### Scenario: Multiple tag filters active
- **WHEN** a user focuses the new-memo editor and multiple tag filters are active
- **THEN** no tag is auto-inserted

#### Scenario: No tag filter active
- **WHEN** a user focuses the new-memo editor and no tag filter is active
- **THEN** no tag is auto-inserted

#### Scenario: Tag already inserted, no duplicate
- **WHEN** a user focuses the editor and a tag was already auto-inserted (content is not empty)
- **THEN** no duplicate tag is inserted

### Requirement: Auto-insert only applies to new memo creation
The auto-insert behavior SHALL only apply when creating a new memo. It SHALL NOT apply when editing an existing memo or writing a comment.

#### Scenario: Editing an existing memo
- **WHEN** a user focuses the editor to edit an existing memo with a single tag filter active
- **THEN** the editor shows the existing memo content without auto-inserting any tag

#### Scenario: Writing a comment reply
- **WHEN** a user focuses the editor to write a comment reply with a single tag filter active
- **THEN** no tag is auto-inserted
