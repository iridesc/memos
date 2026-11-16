import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import IntegrationSection from "@/components/Settings/IntegrationSection";
import { SETTINGS_SECTIONS } from "@/components/Settings/settingSections";

// The integration section is the only place in the UI that points at the
// skill archive and the MCP endpoint, so both must stay reachable.
describe("integration section", () => {
  it("is registered as a basic section", () => {
    const section = SETTINGS_SECTIONS.find((item) => item.key === "integration");
    expect(section).toBeDefined();
    expect(section?.scope).toBe("basic");
  });

  it("links to the skill archive", () => {
    render(<IntegrationSection />);

    const link = screen.getByRole("link", { name: /memodo-skill\.zip/ });
    expect(link).toHaveAttribute("href", "/skills/memodo.zip");
  });

  it("shows the MCP endpoint built from the current origin", () => {
    render(<IntegrationSection />);

    // The endpoint appears both in the copy snippet and in the JSON config.
    expect(screen.getAllByText(new RegExp(`${window.location.origin}/mcp`)).length).toBeGreaterThan(0);
  });
});
