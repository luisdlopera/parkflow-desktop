"use client";

import { ListBox } from "@heroui/react";
import { Alert } from "@/components/bridge/Alert";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@/components/bridge/Modal";
import { Card } from "@/components/bridge/Card";
import { Select } from "@/components/bridge/Select";
import { Tabs } from "@/components/bridge/Tabs";
import { Tab } from "@/components/bridge/Tabs";
import { Button } from "@/components/bridge/Button";
import { Input } from "@/components/bridge/Input";
import { Steps, Step } from "@/components/licensing/Steps";
import { useEffect, useMemo, useState } from "react";
import {
  useDeviceFingerprint,
  useSaveLicense,
  useDesktopLicense,
} from "@/lib/licensing/hooks";
import { listCompanies } from "@/lib/licensing/api";
import type { Company } from "@/lib/licensing/types";
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
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  const { fingerprint } = useDeviceFingerprint();
  const { saveLicense, saving, error, success } = useSaveLicense();
  const { refresh } = useDesktopLicense();
  const selectedCompany = useMemo(
    () => companies.find((company) => company.id === companyId) ?? null,
    [companies, companyId]
  );

  useEffect(() => {
    if (!isOpen) return;

    const loadCompanies = async () => {
      setLoadingCompanies(true);
      try {
        const companyList = await listCompanies();
        setCompanies(companyList);
        if (companyList.length === 1) {
          setCompanyId(companyList[0].id);
        }
      } catch {
        setCompanies([]);
      } finally {
        setLoadingCompanies(false);
      }
    };

    void loadCompanies();
  }, [isOpen]);

  const handleActivate = async () => {
    if (!fingerprint || !selectedCompany) return;

    if (method === "offline") {
      try {
        const licenseData: SaveLicenseRequest = {
          companyId: selectedCompany.id,
          companyName: selectedCompany.name,
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
        close();
      } catch (err) {
        // Error ya está en el hook
      }
    }
  };

  return (
    <Modal state={ { isOpen: isOpen, setOpen: (v: boolean) => { if(!v) onClose(); }, open: () => {}, close: onClose, toggle: () => {} } }>
      <Modal.Content>
        <Modal.Header>Activar Licencia</Modal.Header>
        <Modal.Body>
          <Steps current={step}>
            <Step title="Método" description="Seleccione cómo activar" />
            <Step title="Datos" description="Ingrese información" />
            <Step title="Confirmar" description="Verifique y active" />
          </Steps>

          {step === 0 && (
            <div className="mt-6 space-y-4">
              <Tabs selectedKey={method} onChange={(k) => setMethod(k as ActivationMethod)}>
                <Tab key="offline" title="Activación Offline">
                  <Card>
                    <Card.Content className="space-y-4">
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
                    </Card.Content>
                  </Card>
                </Tab>
                <Tab key="online" title="Activación Online">
                  <Card>
                    <Card.Content>
                      <p className="text-sm text-default-500">
                        La activación online requiere conexión a internet y una
                        cuenta en el sistema ParkFlow Cloud.
                      </p>
                      <Alert color="warning" className="mt-4">
                        Activación online no implementada en versión desktop.
                      </Alert>
                    </Card.Content>
                  </Card>
                </Tab>
              </Tabs>
            </div>
          )}

          {step === 1 && method === "offline" && (
            <div className="mt-6 space-y-4">
              <Select
                label="Empresa"
                value={companyId ? [companyId] : []}
                onChange={(keys) => setCompanyId(Array.from(keys)[0]?.toString() ?? "")}
                isDisabled={loadingCompanies}
                placeholder="Selecciona una empresa"
              >
      <Select.Trigger aria-label="Seleccionar opción">
        <Select.Value aria-label="Seleccionar opción" />
        <Select.Indicator aria-label="Seleccionar opción" />
      </Select.Trigger>
      <Select.Popover aria-label="Seleccionar opción">
        <ListBox>

                {companies.map((company) => (
                  <ListBox.Item key={company.id} textValue={company.name}>
                    {company.name}
                  </ListBox.Item>
                ))}
              
        </ListBox>
      </Select.Popover>
    </Select>
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
        </Modal.Body>
        <Modal.Footer>
          {step > 0 && (
            <Button variant="tertiary" onPress={() => setStep(step - 1)}>
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
              isDisabled={method === "offline" && (!licenseKey || !companyId)}
            >
              Activar
            </Button>
          )}
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
