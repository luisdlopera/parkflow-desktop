import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RatesSection from "../RatesSection";
import type { RateRow } from "@/lib/api/rates-api";

const mockRates: RateRow[] = [
  {
    id: "rate-1",
    name: "Tarifa Auto Hora",
    rateType: "HOURLY",
    vehicleType: "AUTO",
    amount: 5000,
    graceMinutes: 10,
    toleranceMinutes: 5,
    fractionMinutes: 60,
    roundingMode: "UP",
    lostTicketSurcharge: 30000,
    active: true,
    site: "DEFAULT",
    category: "STANDARD",
    siteId: "site-1",
    baseValue: 0,
    baseMinutes: 0,
    additionalValue: 0,
    additionalMinutes: 0,
    minSessionValue: null,
    maxSessionValue: null,
    maxDailyValue: null,
    appliesNight: false,
    nightSurchargePercent: 0,
    appliesHoliday: false,
    holidaySurchargePercent: 0,
    appliesDaysBitmap: null,
    windowStart: null,
    windowEnd: null,
    scheduledActiveFrom: null,
    scheduledActiveTo: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "rate-2",
    name: "Tarifa Moto Diaria",
    rateType: "DAILY",
    vehicleType: "MOTO",
    amount: 8000,
    graceMinutes: 15,
    toleranceMinutes: 5,
    fractionMinutes: 1440,
    roundingMode: "UP",
    lostTicketSurcharge: 20000,
    active: false,
    site: "DEFAULT",
    category: "STANDARD",
    siteId: "site-1",
    baseValue: 0,
    baseMinutes: 0,
    additionalValue: 0,
    additionalMinutes: 0,
    minSessionValue: null,
    maxSessionValue: null,
    maxDailyValue: null,
    appliesNight: false,
    nightSurchargePercent: 0,
    appliesHoliday: false,
    holidaySurchargePercent: 0,
    appliesDaysBitmap: null,
    windowStart: null,
    windowEnd: null,
    scheduledActiveFrom: null,
    scheduledActiveTo: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
];

const mockFetchRates = vi.hoisted(() => vi.fn());
const mockFetchRateById = vi.hoisted(() => vi.fn());
const mockPatchRateStatus = vi.hoisted(() => vi.fn());
const mockDeleteRate = vi.hoisted(() => vi.fn());

vi.mock("@/lib/settings-api", async () => {
  const actual = await vi.importActual("@/lib/settings-api");
  return {
    ...actual,
    fetchRates: (...args: any[]) => mockFetchRates(...args),
    fetchRateById: (...args: any[]) => mockFetchRateById(...args),
    patchRateStatus: (...args: any[]) => mockPatchRateStatus(...args),
    deleteRate: (...args: any[]) => mockDeleteRate(...args),
  };
});

vi.mock("@/features/configuration/components/RateForm", () => ({
  RateForm: ({ onCancel, onSaved }: any) => (
    <div data-testid="rate-form">
      <span>RateForm</span>
      <button data-testid="rate-form-save" onClick={onSaved}>Guardar</button>
      <button data-testid="rate-form-cancel" onClick={onCancel}>Cancelar</button>
    </div>
  ),
}));

vi.mock("@/components/ui/DialogProvider", () => ({
  useDialog: () => ({
    confirm: vi.fn().mockResolvedValue(true),
  }),
}));

describe("RatesSection", () => {
  const onNotify = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchRates.mockResolvedValue({ content: mockRates, totalPages: 1 });
    mockFetchRateById.mockResolvedValue(mockRates[0]);
    mockPatchRateStatus.mockResolvedValue(undefined);
    mockDeleteRate.mockResolvedValue(undefined);
  });

  it("renders DataTable with rates", async () => {
    render(<RatesSection canEdit={true} onNotify={onNotify} auditReason="test" />);

    await waitFor(() => {
      expect(mockFetchRates).toHaveBeenCalled();
    });

    expect(screen.getByText("Tarifa Auto Hora")).toBeInTheDocument();
    expect(screen.getByText("Tarifa Moto Diaria")).toBeInTheDocument();
  });

  it("opens create rate form when Nueva tarifa is clicked", async () => {
    const user = userEvent.setup();
    render(<RatesSection canEdit={true} onNotify={onNotify} auditReason="test" />);

    await waitFor(() => {
      expect(screen.getByText("Nueva tarifa")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Nueva tarifa"));
    expect(screen.getByTestId("rate-form")).toBeInTheDocument();
  });

  it("opens edit rate form when Editar is clicked", async () => {
    const user = userEvent.setup();
    render(<RatesSection canEdit={true} onNotify={onNotify} auditReason="test" />);

    await waitFor(() => {
      expect(screen.getAllByText("Editar").length).toBeGreaterThan(0);
    });

    await user.click(screen.getAllByText("Editar")[0]);
    expect(screen.getByTestId("rate-form")).toBeInTheDocument();
  });

  it("toggles rate status when Activar/Desactivar is clicked", async () => {
    const user = userEvent.setup();
    render(<RatesSection canEdit={true} onNotify={onNotify} auditReason="test" />);

    await waitFor(() => {
      expect(screen.getByText("Desactivar")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Desactivar"));
    await waitFor(() => {
      expect(mockPatchRateStatus).toHaveBeenCalledWith("rate-1", false, "test");
    });
    expect(onNotify).toHaveBeenCalledWith({ kind: "ok", text: "Tarifa desactivada." });
  });

  it("deletes rate when Eliminar is clicked", async () => {
    const user = userEvent.setup();
    render(<RatesSection canEdit={true} onNotify={onNotify} auditReason="test" />);

    await waitFor(() => {
      expect(screen.getAllByText("Eliminar").length).toBeGreaterThan(0);
    });

    await user.click(screen.getAllByText("Eliminar")[0]);
    await waitFor(() => {
      expect(mockDeleteRate).toHaveBeenCalledWith("rate-1", "test");
    });
  });
});
