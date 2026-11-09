import { describe, expect, it } from "vitest";
import { PLAN_TIME_PRESETS } from "@/lib/plan-time";
import en from "@/locales/en.json";
import zhHans from "@/locales/zh-Hans.json";

// The toolbar renders `editor.plan-time.<preset.id>`, so every preset id needs a
// label. Missing keys fall back to the raw key text, which looks like a bug in
// the popover rather than a missing translation.
describe("plan time preset labels", () => {
  const dictionaries = [
    { name: "en", dict: en.editor["plan-time"] as Record<string, string> },
    { name: "zh-Hans", dict: zhHans.editor["plan-time"] as Record<string, string> },
  ];

  it.each(dictionaries)("$name labels every preset", ({ dict }) => {
    for (const preset of PLAN_TIME_PRESETS) {
      expect(dict[preset.id], `missing label for preset ${preset.id}`).toBeTruthy();
    }
  });

  it("keeps the Chinese labels in sync with the requested wording", () => {
    const dict = zhHans.editor["plan-time"] as Record<string, string>;
    expect(dict["after-15m"]).toBe("15 分钟后");
    expect(dict["after-60m"]).toBe("1 小时后");
    expect(dict["after-180m"]).toBe("3 小时后");
    expect(dict["tomorrow"]).toBe("明天上午");
    expect(dict["next-week"]).toBe("下周一");
    expect(dict["next-month"]).toBe("下月 1 号");
  });
});
