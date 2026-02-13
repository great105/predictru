import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WelcomeScreen } from "@/components/WelcomeScreen";

describe("WelcomeScreen", () => {
  it("renders heading 'Предскажи'", () => {
    render(<WelcomeScreen onStart={() => {}} />);
    expect(screen.getByRole("heading", { name: "Предскажи" })).toBeInTheDocument();
  });

  it("does not contain 'PredictRu' anywhere", () => {
    const { container } = render(<WelcomeScreen onStart={() => {}} />);
    expect(container.textContent).not.toContain("PredictRu");
  });

  it("renders all three instruction steps", () => {
    const { container } = render(<WelcomeScreen onStart={() => {}} />);
    expect(container.textContent).toContain("Выбери вопрос");
    expect(container.textContent).toContain("Сделай прогноз");
    expect(container.textContent).toContain("Если угадаешь");
  });

  it("renders start button", () => {
    render(<WelcomeScreen onStart={() => {}} />);
    expect(screen.getByRole("button", { name: /Начать/ })).toBeInTheDocument();
  });

  it("calls onStart when button is clicked", () => {
    const onStart = vi.fn();
    render(<WelcomeScreen onStart={onStart} />);
    fireEvent.click(screen.getByRole("button", { name: /Начать/ }));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("mentions 1000 PRC starting balance", () => {
    const { container } = render(<WelcomeScreen onStart={() => {}} />);
    expect(container.textContent).toContain("1000 PRC");
  });
});
