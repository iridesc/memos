## Context

The About page (`web/src/pages/About.tsx`) currently displays branding for the upstream "Memos" project — name, logo, external links, product points, sponsors. This fork is rebranded as "Memodo" and hosted at `github.com/iridesc/memos`. The page needs to reflect the fork's identity. This is a single-file, frontend-only change with no backend, API, or database impact.

## Goals / Non-Goals

**Goals:**
- Replace all "Memos" branding with "Memodo" on the About page
- Remove upstream sponsor content (CodeRabbit, Warp) that is irrelevant to this fork
- Update or remove external links that point to upstream project resources
- Update the tagline and product points to reflect Memodo's identity

**Non-Goals:**
- Changing any other page or component (Navigation, UserMenu, etc.)
- Updating the logo image (`/logo.webp`) — the existing logo file is reused as-is
- Modifying any backend code, API, or database
- Adding new sections or features to the About page
- Changing the Birds section (kept as-is)

## Decisions

1. **Keep the Birds section** — it's a fun, project-agnostic pixel art showcase. No brand-specific content to change.

2. **Remove sponsors entirely** — the two sponsors (CodeRabbit, Warp) are sponsors of upstream `usememos/memos`, not this fork. There are no replacement sponsors to feature, so the section is removed rather than modified.

3. **Replace external links with project-relevant ones** — the upstream links (`usememos.com`, `github.com/usememos/memos`, `usememos.com/docs`) are replaced with the fork's GitHub URL (`github.com/iridesc/memos`). If no equivalent docs or website exist for the fork, those link buttons are removed.

4. **Keep the same layout/structure** — the existing card-based layout (logo + name + links, product points grid) is preserved. Only copy content changes.

## Risks / Trade-offs

- No deployment or migration complexity — single frontend file change
- No breaking changes — purely cosmetic text and link updates
