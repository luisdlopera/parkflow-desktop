import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmptyState } from "../EmptyState";

describe("EmptyState", () => {
  it("renders title", () => {
    render(
      <EmptyState title="No data" description="There is nothing to show" />
    );
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(
      <EmptyState title="No data" description="There is nothing to show" />
    );
    expect(screen.getByText("There is nothing to show")).toBeInTheDocument();
  });

  it("renders custom icon", () => {
    render(
      <EmptyState
        title="No data"
        description="empty"
        icon={<div data-testid="custom-icon">icon</div>}
      />
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  it("renders action button when actionLabel and onAction are provided", () => {
    render(
      <EmptyState
        title="No data"
        description="empty"
        actionLabel="Add Item"
        onAction={vi.fn()}
      />
    );
    expect(screen.getByText("Add Item")).toBeInTheDocument();
  });

  it("calls onAction when button is clicked", async () => {
    const onAction = vi.fn();
    render(
      <EmptyState
        title="No data"
        description="empty"
        actionLabel="Add Item"
        onAction={onAction}
      />
    );
    await userEvent.click(screen.getByText("Add Item"));
    expect(onAction).toHaveBeenCalledTimes(1);
  });

  it("does not render action button when actionLabel is missing", () => {
    render(
      <EmptyState title="No data" description="empty" />
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
