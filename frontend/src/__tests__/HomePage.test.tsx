import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { HomePage } from "@/pages/HomePage";

// Mock useMarkets to avoid real API calls
vi.mock("@/hooks/useMarkets", () => ({
  useMarkets: () => ({
    data: { pages: [{ items: [] }] },
    fetchNextPage: vi.fn(),
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
  }),
}));

function renderHomePage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("HomePage — welcome screen integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("shows WelcomeScreen on first visit (no localStorage key)", () => {
    renderHomePage();
    expect(screen.getByRole("heading", { name: "Предскажи" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Начать/ })).toBeInTheDocument();
  });

  it("hides WelcomeScreen after clicking 'Начать'", () => {
    renderHomePage();
    fireEvent.click(screen.getByRole("button", { name: /Начать/ }));
    expect(screen.queryByRole("button", { name: /Начать/ })).not.toBeInTheDocument();
  });

  it("sets localStorage key after clicking 'Начать'", () => {
    renderHomePage();
    fireEvent.click(screen.getByRole("button", { name: /Начать/ }));
    expect(localStorage.getItem("onboarding_done")).toBe("1");
  });

  it("skips WelcomeScreen if localStorage key already set", () => {
    localStorage.setItem("onboarding_done", "1");
    renderHomePage();
    expect(screen.queryByRole("heading", { name: "Предскажи" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Начать/ })).not.toBeInTheDocument();
  });
});
