import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OfferForm from "./OfferForm.jsx";

const OFFER =
  "I made a restaurant billing system for mid-level restaurants with waiter service";

async function fillOffer(user, text) {
  await user.clear(screen.getByLabelText(/describe what you sell/i));
  await user.type(screen.getByLabelText(/describe what you sell/i), text);
}

describe("OfferForm", () => {
  it("shows a live character counter", async () => {
    const user = userEvent.setup();
    render(<OfferForm loading={false} onSubmit={() => {}} />);
    expect(screen.getByText(/0\/1000 characters/)).toBeInTheDocument();
    await fillOffer(user, "abc");
    expect(screen.getByText(/3\/1000 characters/)).toBeInTheDocument();
  });

  it("rejects a short offer with an inline message", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<OfferForm loading={false} onSubmit={onSubmit} />);
    await fillOffer(user, "too short");
    await user.type(screen.getByLabelText(/^city$/i), "Ahmedabad");
    await user.click(screen.getByRole("button", { name: /find customers/i }));
    expect(screen.getByText(/20–1000 characters/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits valid input and casts the price to an integer", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<OfferForm loading={false} onSubmit={onSubmit} />);
    await fillOffer(user, OFFER);
    await user.type(screen.getByLabelText(/^city$/i), "Ahmedabad");
    await user.type(screen.getByLabelText(/monthly price/i), "800");
    await user.click(screen.getByRole("button", { name: /find customers/i }));
    expect(onSubmit).toHaveBeenCalledWith({
      offer: OFFER,
      city: "Ahmedabad",
      monthly_price: 800,
    });
    expect(typeof onSubmit.mock.calls[0][0].monthly_price).toBe("number");
  });

  it("omits the price when left blank", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<OfferForm loading={false} onSubmit={onSubmit} />);
    await fillOffer(user, OFFER);
    await user.type(screen.getByLabelText(/^city$/i), "Pune");
    await user.click(screen.getByRole("button", { name: /find customers/i }));
    expect(onSubmit).toHaveBeenCalledWith({ offer: OFFER, city: "Pune" });
  });

  it("rejects non-integer prices", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<OfferForm loading={false} onSubmit={onSubmit} />);
    await fillOffer(user, OFFER);
    await user.type(screen.getByLabelText(/^city$/i), "Pune");
    await user.type(screen.getByLabelText(/monthly price/i), "8.5");
    await user.click(screen.getByRole("button", { name: /find customers/i }));
    expect(screen.getByText(/whole number/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("disables the submit button while loading", () => {
    render(<OfferForm loading onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: /finding customers/i })).toBeDisabled();
  });
});
