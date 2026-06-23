import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeroUIProvider } from "@heroui/system";
import { Popover } from "../Popover";

const renderWithProvider = (ui: React.ReactNode) => render(<HeroUIProvider>{ui}</HeroUIProvider>);

describe("Popover", () => {
  it("renders the trigger", () => {
    renderWithProvider(
      <Popover>
        <Popover.Trigger>
          <button>Open</button>
        </Popover.Trigger>
        <Popover.Content>
          <Popover.Dialog>Popover content</Popover.Dialog>
        </Popover.Content>
      </Popover>
    );

    expect(screen.getByText("Open")).toBeInTheDocument();
  });

  it("opens content when the trigger is clicked", async () => {
    renderWithProvider(
      <Popover>
        <Popover.Trigger>
          <button>Open</button>
        </Popover.Trigger>
        <Popover.Content>
          <Popover.Dialog>Popover content</Popover.Dialog>
        </Popover.Content>
      </Popover>
    );

    await userEvent.click(screen.getByText("Open"));
    expect(screen.getByText("Popover content")).toBeInTheDocument();
  });

  it("closes when Escape is pressed", async () => {
    renderWithProvider(
      <Popover>
        <Popover.Trigger>
          <button>Open</button>
        </Popover.Trigger>
        <Popover.Content>
          <Popover.Dialog>Popover content</Popover.Dialog>
        </Popover.Content>
      </Popover>
    );

    await userEvent.click(screen.getByText("Open"));
    expect(screen.getByText("Popover content")).toBeInTheDocument();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByText("Popover content")).not.toBeInTheDocument();
  });
});
