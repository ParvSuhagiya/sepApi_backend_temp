import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JobCard from "./components/JobCard.jsx";
import ErrorMessage from "./components/ErrorMessage.jsx";

describe("JobCard", () => {
  const job = {
    title: "Tailor needed",
    company: "ABC",
    location: "Pune",
    via: "Test",
    salary: "₹10,000",
    flags: ["Asks for upfront fee"],
    risk: "High",
    link: "https://example.test/apply",
  };

  it("shows a text risk label plus flags and a safe apply link", () => {
    render(<JobCard job={job} />);
    expect(screen.getByText("High risk")).toBeInTheDocument();
    expect(screen.getByText("Asks for upfront fee")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /apply/i });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link.getAttribute("rel")).toContain("noreferrer");
  });
});

describe("ErrorMessage", () => {
  it("retry calls the handler", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorMessage message="Oops, try again." onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Oops, try again.");
    await user.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
