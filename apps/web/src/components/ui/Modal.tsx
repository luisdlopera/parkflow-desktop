import React from "react";
import { Modal as HeroModal } from "@heroui/react";

/**
 * Modal wrapper that bridges the legacy v2 props API to HeroUI v3
 * compound component pattern.
 *
 * Usage patterns supported:
 * 1. Controlled via `state` object: `<Modal state={{ isOpen, setOpen, ... }}>`
 * 2. Controlled via `isOpen` + `onOpenChange`
 */
export const ModalBase = ({
  state,
  isOpen,
  onOpenChange,
  size,
  placement,
  scrollBehavior,
  hideCloseButton,
  isDismissable,
  children,
  className,
  ...props
}: any) => {
  const isModalOpen = state ? state.isOpen : isOpen;
  const handleOpenChange = (open: boolean) => {
    if (state?.setOpen) state.setOpen(open);
    if (onOpenChange) onOpenChange(open);
  };

  // For controlled modals in v3, use Modal.Backdrop directly (no <Modal> wrapper)
  // This ensures isOpen/onOpenChange control the overlay visibility
  return (
    <HeroModal.Backdrop
      isOpen={isModalOpen}
      onOpenChange={handleOpenChange}
      isDismissable={isDismissable ?? true}
    >
      <HeroModal.Container
        size={size}
        placement={placement}
        scroll={scrollBehavior === "inside" ? "inside" : "outside"}
      >
        <HeroModal.Dialog className={className} {...props}>
          {!hideCloseButton && (
            <HeroModal.CloseTrigger className="absolute right-4 top-4 text-default-500 hover:text-default-700" />
          )}
          {children}
        </HeroModal.Dialog>
      </HeroModal.Container>
    </HeroModal.Backdrop>
  );
};

export const ModalContent = ({ children }: any) => {
  // In v2, ModalContent often took a function (onClose) => ReactNode
  // For backward compatibility we provide a dummy onClose if it's a function.
  if (typeof children === "function") {
    return <>{children(() => {})}</>;
  }
  return <>{children}</>;
};

export const ModalHeader = HeroModal.Header;
export const ModalBody = HeroModal.Body;
export const ModalFooter = HeroModal.Footer;

export const Modal = Object.assign(ModalBase, {
  Content: ModalContent,
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
});
