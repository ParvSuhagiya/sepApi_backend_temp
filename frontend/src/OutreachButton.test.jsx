import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OutreachButton from "./components/OutreachButton.jsx";
import * as api from "./api.js";

vi.mock("./api.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, outreach: vi.fn() };
});

const profile = { skills: "tailoring", city: "Pune", hours: 10, budget: 0 };

describe("OutreachButton", () => {
  beforeEach(() => {
    vi.mocked(api.outreach).mockReset();
  });

  it("is hidden without a phone (T-10)", () => {
    const { container } = render(
      <OutreachButton profile={profile} place={{ name: "No Phone Shop" }} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows an editable textarea after drafting", async () => {
    const user = userEvent.setup();
    vi.mocked(api.outreach).mockResolvedValue({
      message: "Hello, I do tailoring work.",
      safety_note: "Verify the business before paying or sharing documents.",
    });
    render(
      <OutreachButton
        profile={profile}
        place={{ name: "Sharma", phone: "9822012345", type: "Tailor" }}
      />
    );
    await user.click(screen.getByRole("button", { name: /draft whatsapp message/i }));
    const box = await screen.findByLabelText(/draft message/i);
    expect(box.tagName).toBe("TEXTAREA");
    await user.clear(box);
    await user.type(box, "Edited draft");
    expect(box).toHaveValue("Edited draft");
    expect(screen.getByText(/verify the business/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /review, then open in whatsapp/i })
    ).toHaveAttribute("href", expect.stringContaining("https://wa.me/919822012345"));
  });

  it("shows an error with retry on failure", async () => {
    const user = userEvent.setup();
    vi.mocked(api.outreach).mockRejectedValueOnce(new Error("down"));
    render(
      <OutreachButton profile={profile} place={{ name: "Sharma", phone: "9822012345" }} />
    );
    await user.click(screen.getByRole("button", { name: /draft whatsapp message/i }));
    expect(await screen.findByText("Could not draft message.")).toBeInTheDocument();
  });

  it("sends only allow-listed target keys", async () => {
    const user = userEvent.setup();
    vi.mocked(api.outreach).mockResolvedValue({ message: "Hi", safety_note: "" });
    render(
      <OutreachButton
        profile={profile}
        place={{ name: "Sharma", phone: "9822012345", type: "Tailor", address: "Pune" }}
      />
    );
    await user.click(screen.getByRole("button", { name: /draft whatsapp message/i }));
    await waitFor(() => expect(api.outreach).toHaveBeenCalled());
    const target = vi.mocked(api.outreach).mock.calls[0][1];
    expect(target).toEqual({ name: "Sharma", type: "Tailor", address: "Pune", rating: undefined });
    expect(target).not.toHaveProperty("phone");
  });
});
