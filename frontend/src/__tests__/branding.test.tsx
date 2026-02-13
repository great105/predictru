import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Layout } from "@/components/Layout";

// Mock authStore
vi.mock("@/stores/authStore", () => ({
  useAuthStore: (selector: (s: { user: null }) => unknown) =>
    selector({ user: null }),
}));

// Mock BalanceDisplay
vi.mock("@/components/BalanceDisplay", () => ({
  BalanceDisplay: () => <span>balance</span>,
}));

describe("Branding — no PredictRu references", () => {
  it("Layout header shows 'Предскажи', not 'PredictRu'", () => {
    const { container } = render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>
    );
    const header = container.querySelector("header");
    expect(header?.textContent).toContain("Предскажи");
    expect(header?.textContent).not.toContain("PredictRu");
  });

  it("index.html title is 'Предскажи'", async () => {
    const fs = await import("fs");
    const html = fs.readFileSync("index.html", "utf-8");
    expect(html).toContain("<title>Предскажи</title>");
    expect(html).not.toContain("<title>PredictRu</title>");
  });

  it("App.tsx auth gate contains 'Предскажи', not 'PredictRu'", async () => {
    const fs = await import("fs");
    const source = fs.readFileSync("src/App.tsx", "utf-8");
    expect(source).toContain("Предскажи");
    expect(source).not.toContain("PredictRu");
  });
});
