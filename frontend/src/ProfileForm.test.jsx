import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ProfileForm from "./components/ProfileForm.jsx";

describe("ProfileForm", () => {
  it("blocks empty skills (T-12)", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProfileForm loading={false} onSubmit={onSubmit} />);
    await user.click(screen.getByRole("button", { name: /find income ideas/i }));
    expect(screen.getByText(/skills \(2–300 characters\)/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("casts numeric fields to integers", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<ProfileForm loading={false} onSubmit={onSubmit} />);
    await user.type(screen.getByLabelText(/skills/i), "tailoring");
    await user.type(screen.getByLabelText(/city/i), "Pune");
    await user.clear(screen.getByLabelText(/hours/i));
    await user.type(screen.getByLabelText(/hours/i), "12");
    await user.click(screen.getByRole("button", { name: /find income ideas/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      skills: "tailoring",
      city: "Pune",
      hours: 12,
      budget: 0,
    });
    expect(typeof onSubmit.mock.calls[0][0].hours).toBe("number");
  });

  it("disables submit while loading", () => {
    render(<ProfileForm loading={true} onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: /searching/i })).toBeDisabled();
  });
});
