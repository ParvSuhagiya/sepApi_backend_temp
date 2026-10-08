import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ErrorMessage from "./ErrorMessage.jsx";

describe("ErrorMessage", () => {
  it("shows the message and retries on click", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorMessage message="We couldn't finish this search." onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't finish this search.");
    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
