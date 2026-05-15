package com.parkflow.modules.cash.application.service;

import com.parkflow.modules.auth.domain.AuthAuditAction;
import com.parkflow.modules.auth.application.service.AuthAuditService;
import com.parkflow.modules.cash.application.port.in.CashConfigurationUseCase;
import com.parkflow.modules.cash.domain.CashSession;
import com.parkflow.modules.cash.domain.CashSessionStatus;
import com.parkflow.modules.cash.dto.CashClosingPrintResponse;
import com.parkflow.modules.cash.dto.CashPolicyResponse;
import com.parkflow.modules.cash.dto.CashRegisterInfoResponse;
import com.parkflow.modules.cash.dto.CashSummaryResponse;
import com.parkflow.modules.cash.domain.repository.CashRegisterPort;
import com.parkflow.modules.cash.domain.repository.CashSessionPort;
import com.parkflow.modules.cash.application.port.in.CashSessionUseCase;
import com.parkflow.modules.cash.service.CashDomainAuditService;
import com.parkflow.modules.cash.service.CashPolicyResolver;
import com.parkflow.modules.auth.domain.AppUser;
import com.parkflow.modules.cash.domain.exception.CashSessionException;

import com.parkflow.modules.auth.domain.repository.AppUserPort;
import com.parkflow.modules.auth.security.SecurityUtils;
import com.parkflow.modules.settings.dto.ParkingParametersData;
import com.parkflow.modules.settings.application.service.ParkingParametersService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.time.OffsetDateTime;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class CashConfigurationManagementService implements CashConfigurationUseCase {

    private final CashRegisterPort cashRegisterPort;
    private final CashSessionPort cashSessionPort;
    private final AppUserPort appUserPort;
    private final CashPolicyResolver cashPolicyResolver;
    private final ParkingParametersService parkingParametersService;
    private final CashSessionUseCase cashSessionUseCase;
    private final AuthAuditService authAuditService;
    private final CashDomainAuditService cashDomainAuditService;

    @Override
    @Transactional(readOnly = true)
    public CashPolicyResponse getPolicy(String siteParam) {
        return cashPolicyResolver.resolvePolicy(StringUtils.hasText(siteParam) ? siteParam.trim() : null);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CashRegisterInfoResponse> listRegisters(String siteParam) {
        String site = normalizeSite(siteParam != null ? siteParam : "default");
        return cashRegisterPort.findBySiteOrderByTerminalAsc(site).stream()
            .map(r -> new CashRegisterInfoResponse(r.getId(), r.getSite(), r.getTerminal(), r.getLabel()))
            .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public CashClosingPrintResponse printClosing(UUID sessionId) {
        CashSession session = cashSessionPort.findById(sessionId)
            .orElseThrow(() -> new CashSessionException(HttpStatus.NOT_FOUND, "Sesion de caja no encontrada"));
            
        if (session.getStatus() != CashSessionStatus.CLOSED) {
            throw new CashSessionException(HttpStatus.BAD_REQUEST, "Solo se imprime comprobante de caja cerrada");
        }
        
        AppUser actor = appUserPort.findById(SecurityUtils.requireUserId())
            .orElseThrow(() -> new CashSessionException(HttpStatus.UNAUTHORIZED, "Usuario no encontrado"));
            
        CashSummaryResponse sum = cashSessionUseCase.getSummary(sessionId);
        ParkingParametersData param = parkingParametersService.get(groupingSiteForParams(session));
        List<String> lines = buildClosingPreviewLines(session, sum, param);
        
        Map<String, Object> ticket = new LinkedHashMap<>();
        ticket.put("ticketId", session.getId().toString());
        ticket.put("templateVersion", "ticket-layout-v1");
        ticket.put("paperWidthMm", 58);
        ticket.put("ticketNumber", "CIERRE-" + session.getId().toString().substring(0, 8));
        ticket.put("parkingName", param != null && StringUtils.hasText(param.getParkingName()) ? param.getParkingName() : "Parkflow");
        ticket.put("plate", "CAJA");
        ticket.put("vehicleType", "OTHER");
        ticket.put("site", session.getCashRegister().getSite());
        ticket.put("lane", null);
        ticket.put("booth", null);
        ticket.put("terminal", session.getCashRegister().getTerminal());
        ticket.put("operatorName", session.getClosedBy() != null ? session.getClosedBy().getName() : session.getOperator().getName());
        ticket.put("issuedAtIso", OffsetDateTime.now().toString());
        ticket.put("legalMessage", buildClosingLegalFootnote(param));
        ticket.put("qrPayload", null);
        ticket.put("barcodePayload", session.getId().toString());
        ticket.put("copyNumber", 1);
        ticket.put("detailLines", lines);

        Map<String, Object> meta = baseMeta(session);
        authAudit(AuthAuditAction.CASH_CLOSING_PRINT, actor, "printed", meta);
        cashDomainAuditService.log(session, null, "CLOSING_PRINT", null, session.getId().toString(), null, meta);

        return new CashClosingPrintResponse("CASH_CLOSING", ticket, lines);
    }

    private String normalizeSite(String site) {
        if (!StringUtils.hasText(site)) {
            return "default";
        }
        return site.trim();
    }

    private String groupingSiteForParams(CashSession s) {
        if (s.getCashRegister().getSite() != null) return s.getCashRegister().getSite();
        return "default";
    }

    private Map<String, Object> baseMeta(CashSession s) {
        Map<String, Object> m = new HashMap<>();
        m.put("sessionId", s.getId().toString());
        m.put("register", s.getCashRegister().getSite() + "/" + s.getCashRegister().getTerminal());
        return m;
    }

    private void authAudit(AuthAuditAction action, AppUser user, String detail, Map<String, Object> meta) {
        authAuditService.log(action, user, null, detail, meta);
    }

    private List<String> buildClosingPreviewLines(
        CashSession session, CashSummaryResponse sum, ParkingParametersData param) {
        List<String> lines = new ArrayList<>();
        String headline =
            param != null && StringUtils.hasText(param.getParkingName())
                ? param.getParkingName().trim()
                : "Parkflow";
        lines.add(headline);
        lines.add("CIERRE DE CAJA — REPORTE Z (informativo)");
        lines.add("Sede: " + session.getCashRegister().getSite());
        lines.add("Terminal: " + session.getCashRegister().getTerminal());
        lines.add("Sesion: " + session.getId());
        if (StringUtils.hasText(session.getSupportDocumentNumber())) {
            lines.add("Consecutivo soporte: " + session.getSupportDocumentNumber());
        }
        lines.add("--- TOTALES NETO LIBRO — CLASE ---");
        if (sum.totalsByMovementType() != null && !sum.totalsByMovementType().isEmpty()) {
            new TreeMap<>(sum.totalsByMovementType())
                .forEach((k, v) -> lines.add(movementLabelEs(k) + ": " + v.toPlainString()));
        } else {
            lines.add("(sin movimientos)");
        }
        lines.add("--- TOTALES NETO LIBRO — MEDIO ---");
        if (sum.totalsByPaymentMethod() != null && !sum.totalsByPaymentMethod().isEmpty()) {
            new TreeMap<>(sum.totalsByPaymentMethod())
                .forEach((k, v) -> lines.add(paymentLabelEs(k) + ": " + v.toPlainString()));
        } else {
            lines.add("(sin medios registrados)");
        }
        lines.add("--- CUADRE ---");
        lines.add("Base apertura: " + sum.openingAmount());
        lines.add("Total esperado libro: " + sum.expectedLedgerTotal());
        lines.add("Contado: " + (session.getCountedAmount() != null ? session.getCountedAmount() : "0.00"));
        lines.add("Diferencia: " + (session.getDifferenceAmount() != null ? session.getDifferenceAmount() : "0.00"));
        lines.add("Cerrado: " + (session.getClosedAt() != null ? session.getClosedAt().toString() : ""));
        if (session.getClosedBy() != null && StringUtils.hasText(session.getClosedBy().getName())) {
            lines.add("Cierra/registra: " + session.getClosedBy().getName());
        }
        if (StringUtils.hasText(session.getClosingWitnessName())) {
            lines.add("Testigo firma/responsable: " + session.getClosingWitnessName().trim());
        }
        lines.add("--- FACTURACION ELECTRONICA (parametros DIAN sede) ---");
        appendFiscalLines(lines, param);
        lines.add(
            "Nota: CUFE/XML UBL 2.1 y envio Dian no estan automatizados;"
                + " use proveedor PSC certificado cuando corresponda.");
        return lines;
    }

    private static void appendFiscalLines(List<String> lines, ParkingParametersData param) {
        if (param == null) {
            lines.add("(sin parametros de sede)");
            return;
        }
        if (StringUtils.hasText(param.getBusinessLegalName())) {
            lines.add("Razon social: " + param.getBusinessLegalName().trim());
        }
        if (StringUtils.hasText(param.getTaxId())) {
            lines.add(
                "NIT: "
                    + param.getTaxId().trim()
                    + (StringUtils.hasText(param.getTaxIdCheckDigit())
                        ? "-" + param.getTaxIdCheckDigit().trim()
                        : ""));
        }
        if (StringUtils.hasText(param.getDianInvoicePrefix())) {
            lines.add("Prefijo numeracion FE: " + param.getDianInvoicePrefix().trim());
        }
        if (StringUtils.hasText(param.getDianResolutionNumber())) {
            StringBuilder r = new StringBuilder("Resolucion No. ").append(param.getDianResolutionNumber().trim());
            if (StringUtils.hasText(param.getDianResolutionDate())) {
                r.append(" fecha ").append(param.getDianResolutionDate().trim());
            }
            lines.add(r.toString());
        }
        if (StringUtils.hasText(param.getDianRangeFrom()) || StringUtils.hasText(param.getDianRangeTo())) {
            lines.add(
                "Rango autorizado: "
                    + (StringUtils.hasText(param.getDianRangeFrom()) ? param.getDianRangeFrom().trim() : "?")
                    + " a "
                    + (StringUtils.hasText(param.getDianRangeTo()) ? param.getDianRangeTo().trim() : "?"));
        }
    }

    private static String movementLabelEs(String key) {
        if (key == null) return "";
        return switch (key) {
            case "PARKING_PAYMENT" -> "Cobros parqueo";
            case "MANUAL_INCOME" -> "Ingresos manual";
            case "MANUAL_EXPENSE" -> "Egresos manual";
            case "WITHDRAWAL" -> "Retiros efectivo";
            case "CUSTOMER_REFUND" -> "Devoluciones cliente";
            case "VOID_OFFSET" -> "Anulaciones (contrapartida)";
            case "DISCOUNT" -> "Descuentos neto libro";
            case "ADJUSTMENT" -> "Ajustes";
            case "LOST_TICKET_PAYMENT" -> "Ticket perdido";
            case "REPRINT_FEE" -> "Reimpresion cobrada";
            default -> key;
        };
    }

    private static String paymentLabelEs(String key) {
        if (key == null) return "";
        return switch (key) {
            case "CASH" -> "Efectivo neto libro";
            case "DEBIT_CARD" -> "Tarjeta debito neto libro";
            case "CREDIT_CARD" -> "Tarjeta credito neto libro";
            case "CARD" -> "Tarjetas neto libro";
            case "QR" -> "QR neto libro";
            case "NEQUI" -> "Nequi neto libro";
            case "DAVIPLATA" -> "Daviplata neto libro";
            case "TRANSFER" -> "Transferencias neto libro";
            case "AGREEMENT" -> "Convenios neto libro";
            case "INTERNAL_CREDIT" -> "Credito interno neto libro";
            case "OTHER" -> "Otros neto libro";
            case "MIXED" -> "Mixtos neto libro";
            default -> key;
        };
    }

    private String buildClosingLegalFootnote(ParkingParametersData p) {
        if (p == null) return "Documento soporte sin parametros FE cargados.";
        boolean hasFe = StringUtils.hasText(p.getDianResolutionNumber())
                || StringUtils.hasText(p.getDianInvoicePrefix())
                || StringUtils.hasText(p.getTaxId())
                || StringUtils.hasText(p.getBusinessLegalName());
        if (!hasFe) return "Documento soporte sin parametros FE cargados.";
        
        StringBuilder sb = new StringBuilder();
        if (StringUtils.hasText(p.getBusinessLegalName())) {
            sb.append(p.getBusinessLegalName().trim()).append(". ");
        }
        if (StringUtils.hasText(p.getTaxId())) {
            sb.append("NIT ").append(p.getTaxId().trim());
            if (StringUtils.hasText(p.getTaxIdCheckDigit())) {
                sb.append("-").append(p.getTaxIdCheckDigit().trim());
            }
            sb.append(". ");
        }
        sb.append("Parametros autorizacion numeracion Factura Electronica registrados; CUFE/XML requiere integracion PSC certificada.");
        return sb.toString();
    }
}
