import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormDrawer } from "../FormDrawer";

describe("FormDrawer", () => {
  it("renders nothing when open is false", () => {
    const { container } = render(
      <FormDrawer open={false} title="Test" onClose={vi.fn()} onSubmit={vi.fn()}>
        <div>content</div>
      </FormDrawer>
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows title when open", () => {
    render(
      <FormDrawer open={true} title="Edit Item" onClose={vi.fn()} onSubmit={vi.fn()}>
        <div>content</div>
      </FormDrawer>
    );
    expect(screen.getByText("Edit Item")).toBeInTheDocument();
  });

  it("renders children content", () => {
    render(
      <FormDrawer open={true} title="Test" onClose={vi.fn()} onSubmit={vi.fn()}>
        <div>form fields</div>
      </FormDrawer>
    );
    expect(screen.getByText("form fields")).toBeInTheDocument();
  });

  it("fires onClose when close button is clicked", async () => {
    const onClose = vi.fn();
    render(
      <FormDrawer open={true} title="Test" onClose={onClose} onSubmit={vi.fn()}>
        <div>content</div>
      </FormDrawer>
    );
    const closeBtn = screen.getByLabelText("Close");
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("fires onClose when cancel button is clicked", async () => {
    const onClose = vi.fn();
    render(
      <FormDrawer open={true} title="Test" onClose={onClose} onSubmit={vi.fn()}>
        <div>content</div>
      </FormDrawer>
    );
    const cancelBtn = screen.getByText("Cancelar");
    await userEvent.click(cancelBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("fires onSubmit when save button is clicked", async () => {
    const onSubmit = vi.fn();
    render(
      <FormDrawer open={true} title="Test" onClose={vi.fn()} onSubmit={onSubmit}>
        <div>content</div>
      </FormDrawer>
    );
    const saveBtn = screen.getByText("Guardar");
    await userEvent.click(saveBtn);
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("shows error message when error prop is set", () => {
    render(
      <FormDrawer open={true} title="Test" onClose={vi.fn()} onSubmit={vi.fn()} error="Something went wrong">
        <div>content</div>
      </FormDrawer>
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows loading state on submit button", () => {
    render(
      <FormDrawer open={true} title="Test" onClose={vi.fn()} onSubmit={vi.fn()} loading>
        <div>content</div>
      </FormDrawer>
    );
    expect(screen.getByText("Guardando...")).toBeInTheDocument();
  });
});
