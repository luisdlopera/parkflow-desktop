import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Avatar } from "../Avatar";

describe("Avatar", () => {
  it("renders an avatar element with src and name", () => {
    const { container } = render(
      <Avatar src="https://example.com/avatar.png" name="John Doe" />
    );
    const avatar = container.querySelector(".avatar");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("name", "John Doe");
    expect(avatar).toHaveAttribute("src", "https://example.com/avatar.png");
  });

  it("renders without an image source", () => {
    const { container } = render(<Avatar name="Jane Doe" />);
    const avatar = container.querySelector(".avatar");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("name", "Jane Doe");
  });
});
