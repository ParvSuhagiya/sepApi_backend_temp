import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LeadCard from "./LeadCard.jsx";
import * as api from "../api.js";

vi.mock("../api.js", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, outreach: vi.fn() };
});

const lead = {
  name: "Sharma Restaurant",
  address: "MG Road Ahmedabad",
  rating: 4.2,
  user_ratings_total: 320,
  business_type: "Restaurant",
  match_score: 82,
  match_reasons: ["Rated 4.2 from 320 reviews on Google Maps"],
  research_notes: "bill was wrong; waited a long time",
  why_fit: "Rated 4.2 from 320 reviews; 2 reviews mention slow billing.",
  pitch_angle: "Cut billing errors.",
  suggested_first_question: "How do you bill today?",
  phone: "919822012345",
  maps_url: "https://maps.google.com/?q=sharma",
  price_level: 2,
  score_breakdown: { mid_level: 80, pain: 66.7, reachability: 66.7, no_software: 100 },
  likely_has_software: true,
  adjustments: ["Reviews unavailable, score uses listing data only"],
};

const profile = { skills: "billing software", city: "Ahmedabad" };

describe("LeadCard", () => {
  beforeEach(() => {
    vi.mocked(api.outreach).mockReset();
  });

  it("renders score, signals and evidence", () => {
    render(<LeadCard rank={1} lead={lead} profile={profile} productSummary="Billing software" />);
    expect(screen.getByText("82")).toBeInTheDocument();
    expect(screen.getAllByText(/Lead score/)).toHaveLength(2);
    expect(screen.getByText(/#1 · Lead score 82/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /sharma restaurant/i })).toBeInTheDocument();
    expect(screen.getByText(/★ 4.2/)).toBeInTheDocument();
    expect(screen.getAllByText(/320 reviews/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Price: ₹₹/)).toBeInTheDocument();
    expect(screen.getByText(/slow billing/)).toBeInTheDocument();
    expect(screen.getByText("From public reviews")).toBeInTheDocument();
    expect(screen.getByText("May already use billing software")).toBeInTheDocument();
    expect(screen.getByText(/bill was wrong/)).toBeInTheDocument();
    expect(screen.getByText("Phone: 919822012345")).toBeInTheDocument();
    const mapsLink = screen.getByRole("link", { name: /view on google maps/i });
    expect(mapsLink).toHaveAttribute("href", "https://maps.google.com/?q=sharma");
    expect(mapsLink).toHaveAttribute("target", "_blank");
    expect(mapsLink).toHaveAttribute("rel", "noreferrer");
    expect(mapsLink).toHaveTextContent(/opens in new tab/);
  });

  it("shows the score breakdown in a details block", async () => {
    const user = userEvent.setup();
    render(<LeadCard rank={2} lead={lead} profile={profile} productSummary="Billing software" />);
    await user.click(screen.getByText("How this score was built"));
    expect(screen.getByText("mid level")).toBeInTheDocument();
    expect(screen.getByText("Reviews unavailable, score uses listing data only")).toBeInTheDocument();
  });

  it("hides the outreach flow without a phone", () => {
    render(
      <LeadCard rank={1} lead={{ ...lead, phone: null }} profile={profile} productSummary="Billing software" />
    );
    expect(screen.queryByRole("button", { name: /draft whatsapp message/i })).not.toBeInTheDocument();
  });

  it("sends only allow-listed keys plus product_summary, never the phone", async () => {
    const user = userEvent.setup();
    vi.mocked(api.outreach).mockResolvedValue({ message: "Hi", safety_note: "Stay safe." });
    render(<LeadCard rank={1} lead={lead} profile={profile} productSummary="Billing software" />);
    await user.click(screen.getByRole("button", { name: /draft whatsapp message/i }));
    await waitFor(() => expect(api.outreach).toHaveBeenCalled());
    const target = vi.mocked(api.outreach).mock.calls[0][1];
    expect(target).toEqual({
      name: "Sharma Restaurant",
      type: "Restaurant",
      address: "MG Road Ahmedabad",
      rating: 4.2,
      product_summary: "Billing software",
    });
    expect(target).not.toHaveProperty("phone");
  });
});
