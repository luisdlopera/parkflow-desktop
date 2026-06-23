import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { Slider } from "../Slider";

describe("Slider", () => {
  it("renders a slider element", () => {
    const { container } = render(<Slider aria-label="Volume" />);
    expect(container.querySelector('[data-slot="slider"]')).toBeInTheDocument();
  });

  it("accepts value and onChange props", () => {
    const onChange = vi.fn();
    const { container } = render(
      <Slider aria-label="Volume" value={30} onChange={onChange} />
    );
    const slider = container.querySelector('[data-slot="slider"]');
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveAttribute("aria-label", "Volume");
  });
});
