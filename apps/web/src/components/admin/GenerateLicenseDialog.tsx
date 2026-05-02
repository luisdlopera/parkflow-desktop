"use client";

import { useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Alert,
  Chip,
  Divider,
  Card,
  CardBody,
} from "@heroui/react";
import {
  Copy,
  Check,
  Monitor,
  FileBadge,
  Download,
} from "lucide-react";
import type { Company } from "@/lib/licensing/types";
import { useGenerateLicense, useDeviceFingerprint } from "@/lib/licensing/hooks";

interface GenerateLicenseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  company: Company;
}

export function GenerateLicenseDialog({
  isOpen,
  onClose,
  company,
}: GenerateLicenseDialogProps) {
  const [deviceFingerprint, setDeviceFingerprint] = useState("");
  const [hostname, setHostname] = useState("");
  const [copied, setCopied] = useState(false);
  const { fingerprint: currentFingerprint } = useDeviceFingerprint();

  const { generateLicense, license, isLoading, error, clearLicense } = useGenerateLicense();

  const handleGenerate = async () => {
    if (!deviceFingerprint) return;

    await generateLicense({
      companyId: company.id,
      deviceFingerprint,
      hostname,
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    clearLicense();
    onClose();
  };

  const handleDownload = () => {
    if (!license) return;

    const licenseData = {
      companyId: company.id,
      companyName: company.name,
      deviceFingerprint: license.deviceId,
      licenseKey: license.licenseKey,
      signature: license.signature,
      expiresAt: license.expiresAt,
      publicKey: license.publicKey,
    };

    const blob = new Blob([JSON.stringify(licenseData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `license-${company.name.replace(/\s+/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="2xl">
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <FileBadge className="w-5 h-5" />
          Generar Licencia Offline
        </ModalHeader>
        <ModalBody className="space-y-4">
          {/* Company Info */}
          <Card>
            <CardBody className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-default-500">Empresa:</span>
                <span className="font-medium">{company.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-default-500">Plan:</span>
                <Chip size="sm" color="primary" variant="flat">
                  {company.plan}
                </Chip>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-default-500">Dispositivos usados:</span>
                <span>
                  {company.devices?.length || 0} / {company.maxDevices}
                </span>
              </div>
            </CardBody>
          </Card>

          <Divider />

          {!license ? (
            <>
              <Alert color="primary">
                <p className="text-sm">
                  Para activación offline, ingrese el fingerprint del dispositivo proporcionado
                  por el cliente desde la pantalla de Configuración &gt; Licencia.
                </p>
              </Alert>

              <Input
                label="Device Fingerprint *"
                placeholder="Ej: fp-a1b2c3d4e5f6..."
                value={deviceFingerprint}
                onChange={(e) => setDeviceFingerprint(e.target.value)}
                startContent={<Monitor className="w-4 h-4 text-default-400" />}
                description="El cliente puede encontrar esto en Configuración > Licencia"
              />

              {currentFingerprint && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    onPress={() => setDeviceFingerprint(currentFingerprint)}
                  >
                    Usar fingerprint de este dispositivo
                  </Button>
                </div>
              )}

              <Input
                label="Hostname (opcional)"
                placeholder="Nombre del equipo"
                value={hostname}
                onChange={(e) => setHostname(e.target.value)}
              />

              {error && <Alert color="danger">{error.message}</Alert>}
            </>
          ) : (
            <>
              <Alert color="success">
                ¡Licencia generada exitosamente! Comparta estos datos con el cliente.
              </Alert>

              <div className="space-y-3">
                <div className="p-3 bg-default-100 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">License Key:</span>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => handleCopy(license.licenseKey)}
                    >
                      {copied ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <code className="block text-xs break-all bg-default-200 p-2 rounded">
                    {license.licenseKey}
                  </code>
                </div>

                <div className="p-3 bg-default-100 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium">Signature:</span>
                    <Button
                      isIconOnly
                      size="sm"
                      variant="light"
                      onPress={() => handleCopy(license.signature)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <code className="block text-xs break-all bg-default-200 p-2 rounded">
                    {license.signature}
                  </code>
                </div>

                {license.expiresAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-default-500">Vencimiento:</span>
                    <span>{new Date(license.expiresAt).toLocaleDateString("es-CO")}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          {!license ? (
            <>
              <Button variant="flat" onPress={handleClose}>
                Cancelar
              </Button>
              <Button
                color="primary"
                onPress={handleGenerate}
                isLoading={isLoading}
                isDisabled={!deviceFingerprint}
              >
                Generar Licencia
              </Button>
            </>
          ) : (
            <>
              <Button variant="flat" onPress={handleClose}>
                Cerrar
              </Button>
              <Button color="primary" startContent={<Download className="w-4 h-4" />} onPress={handleDownload}>
                Descargar JSON
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
