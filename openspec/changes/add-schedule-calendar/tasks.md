- [x] Add authenticated calendar route and navigation.
- [x] Implement local month/week ranges and plan interval grouping.
- [x] Load all matching pages with cancellation and cache invalidation support.
- [x] Add heat cells, period controls, day dialog and detail links.
- [x] Add Chinese and English labels and explicit loading/error/empty states.
- [x] Validate date boundaries, pagination, view switching and drilldown.
- [x] Run frontend lint/build and inspect mobile/desktop layouts.

Validation: frontend lint/build passed; 18 related tests passed, including calendar counts/pagination and authenticated routing. Seven date tests also passed with TZ=America/New_York. Real Chromium checks covered month/week switching, period navigation, day drilldown, memo detail links and 320/390/768px layouts.
