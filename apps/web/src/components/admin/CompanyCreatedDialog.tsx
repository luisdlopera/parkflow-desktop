"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Copy, Check, Eye, EyeOff, Building2, User, KeyRound } from "lucide-react";
import type { Company } from "@/lib/licensing/types";

interface CompanyCreatedDialogProps {
  isOpen: boolean;
  company: Company;
  onClose: () => void;
}

export function CompanyCreatedDialog({
  isOpen,
  onClose,
  company,
}: CompanyCreatedDialogProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopy = async (text: string, setter: (v: boolean) => void) => {
    try {
      await navigator.clipboard.writeText(text);
      setter(true);
      setTimeout(() => setter(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      setter(false);
    }
  };

  const handleCopyAll = async () => {
    const text = [
      `Empresa: ${company.name}`,
      company.email && `Email: ${company.email}`,
      `Contraseña: ${company.adminPassword}`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      setCopiedAll(false);
    }
  };

  const handleClose = () => {
    setShowPassword(false);
    setCopiedPassword(false);
    setCopiedEmail(false);
    setCopiedAll(false);
    onClose();
  };

  return (
    <Modal
      state={{
        isOpen,
        setOpen: (v: boolean) => {
          if (!v) handleClose();
        },
        open: () => {},
        close: handleClose,
        toggle: () => {},
      }}
    >
      <Modal.Content>
        <Modal.Header className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Empresa Creada Exitosamente
        </Modal.Header>
        <Modal.Body className="space-y-4">
          <Alert color="success">
            La empresa <strong>{company.name}</strong> ha sido creada correctamente.
            Guarde las siguientes credenciales — solo se muestran una vez.
          </Alert>

          <div className="space-y-3">
            <div className="p-3 bg-default-100 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-default-500" />
                <span className="text-sm font-medium">Email Administrador</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">{company.email || "—"}</span>
                {company.email && (
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label="Copiar email"
                    onPress={() => handleCopy(company.email!, setCopiedEmail)}
                  >
                    {copiedEmail ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>

            <div className="p-3 bg-default-100 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="w-4 h-4 text-default-500" />
                <span className="text-sm font-medium">Contraseña</span>
              </div>
              <div className="flex justify-between items-center">
                <code className="text-sm bg-default-200 px-2 py-1 rounded font-mono">
                  {showPassword ? company.adminPassword : "••••••••"}
                </code>
                <div className="flex gap-1">
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    aria-label="Copiar contraseña"
                    onPress={() =>
                      handleCopy(company.adminPassword || "", setCopiedPassword)
                    }
                  >
                    {copiedPassword ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="tertiary"
            startContent={copiedAll ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            onPress={handleCopyAll}
          >
            {copiedAll ? "Copiado" : "Copiar credenciales"}
          </Button>
          <Button color="primary" onPress={handleClose}>
            Ir a empresas
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
