import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModeSwitch from "./ModeSwitch.jsx";

describe("ModeSwitch", () => {
  it("renders two tabs with the income tab selected", () => {
    render(<ModeSwitch mode="income" onChange={() => {}} />);
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(2);
    expect(screen.getByRole("tab", { name: /find income ideas/i })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(
      screen.getByRole("tab", { name: /find customers for my product/i })
    ).toHaveAttribute("aria-selected", "false");
  });

  it("switches mode on click", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ModeSwitch mode="income" onChange={onChange} />);
    await user.click(screen.getByRole("tab", { name: /find customers/i }));
    expect(onChange).toHaveBeenCalledWith("customers");
  });

  it("supports arrow-key navigation", async () => {
    const user = userEvent.setup();
    const seen = [];
    render(<ModeSwitch mode="income" onChange={(mode) => seen.push(mode)} />);
    const first = screen.getByRole("tab", { name: /find income ideas/i });
    first.focus();
    await user.keyboard("{ArrowRight}");
    expect(seen).toEqual(["customers"]);
    expect(
      screen.getByRole("tab", { name: /find customers for my product/i })
    ).toHaveFocus();
  });

  it("wraps with ArrowLeft from the first tab", async () => {
    const user = userEvent.setup();
    const seen = [];
    render(<ModeSwitch mode="income" onChange={(mode) => seen.push(mode)} />);
    screen.getByRole("tab", { name: /find income ideas/i }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(seen).toEqual(["customers"]);
  });
});
