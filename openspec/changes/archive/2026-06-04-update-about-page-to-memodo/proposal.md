## Why

The About page currently displays upstream "Memos" branding (name, links, sponsors, slogan) from the original project at `usememos/memos`. Since this fork is rebranded as "Memodo" on `github.com/iridesc/memos`, the About page should reflect the current project identity instead of presenting unrelated third-party branding.

## What Changes

- Replace product name "Memos" with "Memodo" in the About page header and description
- Update or remove external links pointing to `usememos.com` and `github.com/usememos/memos` (replace with links relevant to the fork, or remove if none exist)
- Replace the tagline "Capture first. Keep it yours." with a memodo-appropriate description
- Replace upstream product points ("Open. Write. Done.", etc.) with memodo-relevant messaging
- Remove the "Sponsors" section (CodeRabbit, Warp) — these are upstream Memos sponsors, not memodo's
- Keep the "Birds" section intact (it's a fun, project-agnostic feature)

## Capabilities

### New Capabilities

- `about-page-branding`: Update the About page in the web frontend to display "Memodo" branding, relevant project links, and remove upstream-specific sponsor content.

### Modified Capabilities

<!-- No existing specs relate to the About page. -->

## Impact

- **Affected code**: `web/src/pages/About.tsx` (single file, frontend only)
- **No API changes, no database changes, no dependency changes**
- **Breaking**: None — purely cosmetic UI change
