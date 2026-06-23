import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorState } from "../ErrorState";

describe("ErrorState", () => {
  it("renders error title", () => {
    render(
      <ErrorState title="Error occurred" description="Something went wrong" />
    );
    expect(screen.getByText("Error occurred")).toBeInTheDocument();
  });

  it("renders error description", () => {
    render(
      <ErrorState title="Error" description="Something went wrong" />
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
  });

  it("shows retry button when onRetry is provided", () => {
    render(
      <ErrorState title="Error" description="err" onRetry={vi.fn()} />
    );
    expect(screen.getByText("Reintentar")).toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", async () => {
    const onRetry = vi.fn();
    render(
      <ErrorState title="Error" description="err" onRetry={onRetry} />
    );
    await userEvent.click(screen.getByText("Reintentar"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("does not show retry button when onRetry is not provided", () => {
    render(
      <ErrorState title="Error" description="err" />
    );
    expect(screen.queryByText("Reintentar")).not.toBeInTheDocument();
  });

  it("shows technical info toggle when showTechnical is true", () => {
    render(
      <ErrorState
        title="Error"
        description="err"
        errorCode="ERR_001"
        correlationId="corr-123"
        technicalDetails="Stack trace"
        showTechnical
      />
    );
    expect(screen.getByText("Información técnica")).toBeInTheDocument();
  });

  it("shows technical details when expanded", async () => {
    render(
      <ErrorState
        title="Error"
        description="err"
        errorCode="ERR_001"
        correlationId="corr-123"
        technicalDetails="Stack trace"
        showTechnical
      />
    );
    await userEvent.click(screen.getByText("Información técnica"));
    expect(screen.getByText(/ERR_001/)).toBeInTheDocument();
    expect(screen.getByText(/corr-123/)).toBeInTheDocument();
  });
});
