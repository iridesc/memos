## 1. Update About page branding

- [x] 1.1 Update product name, tagline, and description text from "Memos" to "Memodo" in `web/src/pages/About.tsx`
- [x] 1.2 Replace `PRODUCT_LINKS` — remove upstream links (`usememos.com`, `usememos.com/docs`), replace GitHub link with `https://github.com/iridesc/memos`
- [x] 1.3 Replace `PRODUCT_POINTS` with memodo-relevant descriptions
- [x] 1.4 Remove the `SPONSORS` constant, `SponsorLogo` component, and the Sponsors `SettingGroup` section
- [x] 1.5 Verify Birds section is preserved as-is

## 2. Validate

- [x] 2.1 Run `pnpm lint` to verify no TypeScript or Biome errors
- [ ] 2.2 Visually confirm the About page renders correctly with `pnpm dev` (manual verification)
