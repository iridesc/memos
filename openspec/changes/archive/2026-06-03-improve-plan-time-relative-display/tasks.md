## 1. Internationalization

- [x] 1.1 Add plan time translation keys to `web/src/locales/en.json`: not-started, in-progress, expired, starts-imminent, ends-imminent, and time unit labels (minute/hour/day/month with plural forms)
- [x] 1.2 Add plan time translation keys to `web/src/locales/zh-Hans.json`: 未开始/进行中/已过期/即将开始/即将结束 及中文单位

## 2. Relative Time Utility

- [x] 2.1 Create `web/src/lib/time.ts` with `formatRelativePlanTime(start: Date, end: Date, now: Date)` function returning `{ state, startOffset, duration }`
- [x] 2.2 Implement three-state classification: not-started (start > now), in-progress (start < now < end), expired (end < now)
- [x] 2.3 Implement single largest unit selection with 1 decimal place (minutes for <60min, hours for <24h, days for <30d, months for ≥30d)
- [x] 2.4 Strip trailing ".0" for whole number values
- [x] 2.5 Handle edge cases: <60s imminent, zero duration

## 3. Update MemoHeader Component

- [x] 3.1 Update `PlanTimeDisplay` to use `formatRelativePlanTime` and render three distinct display states (not-started / in-progress / expired)
- [x] 3.2 Remove `📅` emoji prefix from plan time display (text is now self-describing)
- [x] 3.3 Remove `displayTime` text from card header: remove `<relative-time>` element, `timeValue`/`displayTime` variables, and `TimeDisplay` component
- [x] 3.4 Simplify `CreatorDisplay` to not render time text (keep avatar, name, and tooltip)
- [x] 3.5 Keep tooltip content unchanged — all precise timestamps (created, updated, plan start, plan end) remain on hover

## 4. Verify

- [x] 4.1 Run `pnpm lint` to ensure no TypeScript or formatting errors
- [x] 4.2 Run `pnpm dev` and verify plan time displays correctly for all three states
- [x] 4.3 Test edge cases: future plan (decimal hours), in-progress, expired, imminent (<1min), no plan time
- [x] 4.4 Verify memo cards without plan time show no time text (only creator if enabled)
