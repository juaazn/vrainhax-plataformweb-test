import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommandForm } from "@/components/forms/command-form";

describe("CommandForm", () => {
  it("renders send button", () => {
    render(<CommandForm onSend={vi.fn(async () => undefined)} />);
    expect(screen.getByRole("button", { name: /send command/i })).toBeInTheDocument();
  });
});
