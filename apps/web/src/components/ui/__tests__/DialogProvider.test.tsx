import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DialogProvider, useDialog } from "../DialogProvider";
import { useDialogStore } from "../dialog-store";
import React from "react";

function TestConsumer() {
  const { confirm, prompt } = useDialog();
  const [result, setResult] = React.useState<string>("none");

  return (
    <div>
      <button
        onClick={async () => {
          const res = await confirm("Are you sure?");
          setResult(res ? "confirmed" : "cancelled");
        }}
      >
        Show Confirm
      </button>
      <button
        onClick={async () => {
          const res = await prompt("Enter value", { defaultValue: "hello" });
          setResult(res !== null ? `prompted:${res}` : "prompt-cancelled");
        }}
      >
        Show Prompt
      </button>
      <div data-testid="result">{result}</div>
    </div>
  );
}

describe("DialogProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders children", () => {
    render(
      <DialogProvider>
        <div>child</div>
      </DialogProvider>
    );
    expect(screen.getByText("child")).toBeInTheDocument();
  });

  it("provides context to children", () => {
    render(
      <DialogProvider>
        <TestConsumer />
      </DialogProvider>
    );
    expect(screen.getByText("Show Confirm")).toBeInTheDocument();
  });

  it("opens confirm dialog and confirms", async () => {
    render(
      <DialogProvider>
        <TestConsumer />
      </DialogProvider>
    );
    await userEvent.click(screen.getByText("Show Confirm"));
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    const acceptBtn = screen.getByText("Aceptar");
    await userEvent.click(acceptBtn);
    expect(screen.getByTestId("result").textContent).toBe("confirmed");
  });

  it("opens confirm dialog and cancels", async () => {
    render(
      <DialogProvider>
        <TestConsumer />
      </DialogProvider>
    );
    await userEvent.click(screen.getByText("Show Confirm"));
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    const cancelBtn = screen.getByText("Cancelar");
    await userEvent.click(cancelBtn);
    expect(screen.getByTestId("result").textContent).toBe("cancelled");
  });

  it("opens prompt dialog and accepts with input", async () => {
    render(
      <DialogProvider>
        <TestConsumer />
      </DialogProvider>
    );
    await userEvent.click(screen.getByText("Show Prompt"));
    expect(screen.getByText("Enter value")).toBeInTheDocument();
    const acceptBtn = screen.getByText("Aceptar");
    await userEvent.click(acceptBtn);
    expect(screen.getByTestId("result").textContent).toBe("prompted:hello");
  });

  it("opens prompt dialog and cancels", async () => {
    render(
      <DialogProvider>
        <TestConsumer />
      </DialogProvider>
    );
    await userEvent.click(screen.getByText("Show Prompt"));
    const cancelBtn = screen.getByText("Cancelar");
    await userEvent.click(cancelBtn);
    expect(screen.getByTestId("result").textContent).toBe("prompt-cancelled");
  });

  it("starts with no dialog open", () => {
    const { dialog } = useDialogStore.getState();
    expect(dialog.isOpen).toBe(false);
  });
});
