import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HeroUIProvider } from "@heroui/system";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "../Modal";

const renderWithProvider = (ui: React.ReactNode) => render(<HeroUIProvider>{ui}</HeroUIProvider>);

describe("Modal", () => {
  it("renders when open and hides when closed", () => {
    const { rerender } = renderWithProvider(
      <Modal isOpen aria-label="Test dialog">
        <ModalContent>
          <ModalBody>Modal body</ModalBody>
        </ModalContent>
      </Modal>
    );

    expect(screen.getByText("Modal body")).toBeInTheDocument();

    rerender(
      <HeroUIProvider>
        <Modal isOpen={false} aria-label="Test dialog">
          <ModalContent>
            <ModalBody>Modal body</ModalBody>
          </ModalContent>
        </Modal>
      </HeroUIProvider>
    );

    expect(screen.queryByText("Modal body")).not.toBeInTheDocument();
  });

  it("closes when the backdrop is clicked", async () => {
    const onOpenChange = vi.fn();
    renderWithProvider(
      <Modal isOpen onOpenChange={onOpenChange} aria-label="Test dialog">
        <ModalContent>
          <ModalBody>Body</ModalBody>
        </ModalContent>
      </Modal>
    );

    const backdrop = document.querySelector('[data-slot="modal-backdrop"]');
    expect(backdrop).toBeInTheDocument();
    await userEvent.click(backdrop!);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders header, body and footer", () => {
    renderWithProvider(
      <Modal isOpen aria-label="Test dialog">
        <ModalContent>
          <ModalHeader>Header</ModalHeader>
          <ModalBody>Body</ModalBody>
          <ModalFooter>Footer</ModalFooter>
        </ModalContent>
      </Modal>
    );

    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByText("Footer")).toBeInTheDocument();
  });
});
