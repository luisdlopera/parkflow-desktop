import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "../Card";

describe("Card", () => {
  it("renders header, body and footer", () => {
    render(
      <Card>
        <Card.Header>Header</Card.Header>
        <Card.Body>Body</Card.Body>
        <Card.Footer>Footer</Card.Footer>
      </Card>
    );

    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });

  it("applies the bordered variant when shadow is set", () => {
    const { container } = render(<Card shadow="md">Content</Card>);
    const card = container.querySelector("[data-slot='card']");
    expect(card).toBeInTheDocument();
    expect(card?.className).toContain("border");
    expect(card?.className).toContain("border-default-200");
  });
});
