"use client";

import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Tab,
  Tabs,
  Card,
  CardBody,
  Alert,
} from "@heroui/react";
import { Steps, Step } from "@/components/ui/Steps";
import { useState } from "react";
import {
  useDeviceFingerprint,
  useSaveLicense,
  useDesktopLicense,
} from "@/lib/licensing/hooks";
import type { SaveLicenseRequest } from "@/lib/licensing/types";

interface LicenseActivationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ActivationMethod = "online" | "offline";

/**
 * Diálogo para activar o renovar licencia
 * Soporta activación online (con cuenta) u offline (con clave)
 */
export function LicenseActivationDialog({
  isOpen,
  onClose,
}: LicenseActivationDialogProps) {
  const [method, setMethod] = useState<ActivationMethod>("offline");
  const [step, setStep] = useState(0);
  const [licenseKey, setLicenseKey] = useState("");
  const [signature, setSignature] = useState("");

  const { fingerprint } = useDeviceFingerprint();
  const { saveLicense, saving, error, success } = useSaveLicense();
  const { refresh } = useDesktopLicense();

  const handleActivate = async () => {
    if (!fingerprint) return;

    if (method === "offline") {
      // Para activación offline, necesitamos companyId, licenseKey y signature
      // Esto normalmente viene de un archivo o QR proporcionado por el admin
      try {
        const licenseData: SaveLicenseRequest = {
          companyId: "00000000-0000-0000-0000-000000000001", // Temporal - debería venir de la licencia
          companyName: "Empresa Temporal",
          deviceFingerprint: fingerprint,
          licenseKey,
          plan: "LOCAL",
          status: "ACTIVE",
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          enabledModules: ["LOCAL_PRINTING"],
          signature: signature || licenseKey, // En desarrollo usamos hash simple
          publicKey: "", // Se usa hash si no hay RSA
        };

        await saveLicense(licenseData);
        await refresh();
        onClose();
      } catch (err) {
        // Error ya está en el hook
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl">
      <ModalContent>
        <ModalHeader>Activar Licencia</ModalHeader>
        <ModalBody>
          <Steps current={step}>
            <Step title="Método" description="Seleccione cómo activar" />
            <Step title="Datos" description="Ingrese información" />
            <Step title="Confirmar" description="Verifique y active" />
          </Steps>

          {step === 0 && (
            <div className="mt-6 space-y-4">
              <Tabs selectedKey={method} onSelectionChange={(k) => setMethod(k as ActivationMethod)}>
                <Tab key="offline" title="Activación Offline">
                  <Card>
                    <CardBody className="space-y-4">
                      <p className="text-sm text-default-500">
                        Para activación offline, necesita una licencia proporcionada
                        por el administrador del sistema.
                      </p>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Su fingerprint:</p>
                        <code className="block p-2 bg-default-100 rounded text-xs break-all">
                          {fingerprint || "Cargando..."}
                        </code>
                      </div>
                    </CardBody>
                  </Card>
                </Tab>
                <Tab key="online" title="Activación Online">
                  <Card>
                    <CardBody>
                      <p className="text-sm text-default-500">
                        La activación online requiere conexión a internet y una
                        cuenta en el sistema ParkFlow Cloud.
                      </p>
                      <Alert color="warning" className="mt-4">
                        Activación online no implementada en versión desktop.
                      </Alert>
                    </CardBody>
                  </Card>
                </Tab>
              </Tabs>
            </div>
          )}

          {step === 1 && method === "offline" && (
            <div className="mt-6 space-y-4">
              <Input
                label="Clave de Licencia"
                placeholder="Ingrese la clave proporcionada"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
              />
              <Input
                label="Firma Digital (opcional en desarrollo)"
                placeholder="Ingrese la firma si la tiene"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
              />
            </div>
          )}

          {step === 2 && (
            <div className="mt-6 space-y-4">
              <Alert color="primary">
                <p>Revise los datos antes de activar:</p>
                <ul className="list-disc list-inside mt-2 text-sm">
                  <li>Método: {method === "offline" ? "Offline" : "Online"}</li>
                  <li>Fingerprint: {fingerprint?.slice(0, 20)}...</li>
                  {method === "offline" && <li>License Key: {licenseKey.slice(0, 20)}...</li>}
                </ul>
              </Alert>

              {error && <Alert color="danger">{error}</Alert>}
              {success && <Alert color="success">¡Licencia activada exitosamente!</Alert>}
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {step > 0 && (
            <Button variant="flat" onPress={() => setStep(step - 1)}>
              Anterior
            </Button>
          )}
          {step < 2 ? (
            <Button color="primary" onPress={() => setStep(step + 1)}>
              Siguiente
            </Button>
          ) : (
            <Button
              color="success"
              onPress={handleActivate}
              isLoading={saving}
              isDisabled={method === "offline" && !licenseKey}
            >
              Activar
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
