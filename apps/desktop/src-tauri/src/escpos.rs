//! ESC/POS bytes for 58mm / 80mm thermal printers (subset; vendor-specific status parsing stays conservative).

use crate::printer_profile::EscPosProfile;
use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TicketDoc {
  pub ticket_id: String,
  pub template_version: Option<String>,
  pub paper_width_mm: Option<u8>,
  pub ticket_number: String,
  pub parking_name: String,
  pub plate: String,
  /// Ignored for ESC/POS body; may be present for audit/compat (matches `TicketDocument`).
  #[allow(dead_code)]
  pub vehicle_type: Option<String>,
  pub site: Option<String>,
  pub lane: Option<String>,
  pub booth: Option<String>,
  pub terminal: Option<String>,
  pub operator_name: Option<String>,
  pub issued_at_iso: String,
  pub legal_message: Option<String>,
  pub qr_payload: Option<String>,
  pub barcode_payload: Option<String>,
  pub copy_number: Option<i32>,
  /// Matches shared contract `TicketDocument.printerProfile` (slug).
  pub printer_profile: Option<String>,
  #[serde(rename = "detailLines")]
  pub detail_lines: Option<Vec<String>>,
}

fn line_width_chars(paper_mm: u8) -> usize {
  if paper_mm >= 80 {
    48
  } else {
    32
  }
}

/// Center plain text line using approximate char width (monospace assumption on fixed fonts).
fn push_line_centered(buf: &mut Vec<u8>, text: &str, width: usize) {
  let t = text.trim();
  if t.len() <= width {
    let pad = width.saturating_sub(t.len()) / 2;
    buf.extend(vec![b' '; pad.min(24)]);
    buf.extend_from_slice(t.as_bytes());
    buf.push(b'\n');
    return;
  }
  buf.extend_from_slice(t.as_bytes());
  buf.push(b'\n');
}

fn push_qr_model2(buf: &mut Vec<u8>, data: &str) -> Result<(), String> {
  let bytes = data.as_bytes();
  if bytes.len() > 1800 {
    return Err("qr payload too large".to_string());
  }
  let store_len = bytes.len() + 3;
  let p_l = (store_len & 0xff) as u8;
  let p_h = ((store_len >> 8) & 0xff) as u8;
  buf.push(0x1d);
  buf.push(0x28);
  buf.push(0x6b);
  buf.push(0x04);
  buf.push(0x00);
  buf.push(0x31);
  buf.push(0x41);
  buf.push(0x32);
  buf.push(0x00);
  buf.push(0x1d);
  buf.push(0x28);
  buf.push(0x6b);
  buf.push(p_l);
  buf.push(p_h);
  buf.push(0x31);
  buf.push(0x50);
  buf.push(0x30);
  buf.extend_from_slice(bytes);
  buf.push(0x1d);
  buf.push(0x28);
  buf.push(0x6b);
  buf.push(0x03);
  buf.push(0x00);
  buf.push(0x31);
  buf.push(0x51);
  buf.push(0x30);
  Ok(())
}

/// Build receipt bytes. `kind` is ENTRY | EXIT | REPRINT | LOST_TICKET (SCREAMING_SNAKE_CASE or lowercase).
pub fn build_receipt(kind: &str, ticket: &TicketDoc, profile: &EscPosProfile) -> Result<Vec<u8>, String> {
  let paper = ticket.paper_width_mm.unwrap_or(58);
  let w = line_width_chars(paper);
  let mut out = Vec::new();
  out.extend_from_slice(&[0x1b, 0x40]);
  out.extend_from_slice(&[0x1b, 0x61, 0x01]);
  let title = match kind.to_ascii_uppercase().as_str() {
    "ENTRY" => "ENTRADA",
    "EXIT" => "SALIDA",
    "REPRINT" => "REIMPRESION",
    "LOST_TICKET" => "TIQUETE PERDIDO",
    "CASH_CLOSING" => "CIERRE DE CAJA",
    "CASH_MOVEMENT" => "MOVIMIENTO CAJA",
    "CASH_COUNT" => "ARQUEO DE CAJA",
    _ => "PARQUEADERO",
  };
  push_line_centered(&mut out, title, w);
  out.extend_from_slice(&[0x1b, 0x61, 0x00]);
  push_line_centered(&mut out, &ticket.parking_name, w);
  out.push(b'\n');
  let mut line = format!("No: {}", ticket.ticket_number);
  push_line_centered(&mut out, &line, w);
  line = format!("Placa: {}", ticket.plate);
  push_line_centered(&mut out, &line, w);
  line = format!("Id: {}", ticket.ticket_id);
  push_line_centered(&mut out, &line, w);
  if let Some(ref v) = ticket.template_version {
    line = format!("Tpl: {}", v);
    push_line_centered(&mut out, &line, w);
  }
  push_line_centered(&mut out, &format!("Fecha: {}", ticket.issued_at_iso), w);
  if let Some(ref o) = ticket.operator_name {
    push_line_centered(&mut out, &format!("Operador: {}", o), w);
  }
  if let Some(ref s) = ticket.site {
    push_line_centered(&mut out, &format!("Sede: {}", s), w);
  }
  if let Some(ref l) = ticket.lane {
    push_line_centered(&mut out, &format!("Carril: {}", l), w);
  }
  if let Some(ref b) = ticket.booth {
    push_line_centered(&mut out, &format!("Cabina: {}", b), w);
  }
  if let Some(ref t) = ticket.terminal {
    push_line_centered(&mut out, &format!("Terminal: {}", t), w);
  }
  if let Some(n) = ticket.copy_number {
    push_line_centered(&mut out, &format!("Copia: {}", n), w);
  }
  if let Some(ref m) = ticket.legal_message {
    out.push(b'\n');
    out.extend_from_slice(m.as_bytes());
    out.push(b'\n');
  }
  if let Some(ref qr) = ticket.qr_payload {
    out.push(b'\n');
    push_qr_model2(&mut out, qr)?;
  } else if let Some(ref bc) = ticket.barcode_payload {
    out.push(b'\n');
    out.extend_from_slice(format!("Codigo: {}\n", bc).as_bytes());
  }
  if let Some(ref lines) = ticket.detail_lines {
    out.push(b'\n');
    for line in lines {
      out.extend_from_slice(line.as_bytes());
      out.push(b'\n');
    }
  }
  out.push(b'\n');
  out.push(b'\n');
  out.push(b'\n');
  out.extend_from_slice(profile.cut_bytes());
  Ok(out)
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn receipt_contains_ticket_number() {
    let t = TicketDoc {
      ticket_id: "tid-1".to_string(),
      template_version: Some("ticket-layout-v1".to_string()),
      paper_width_mm: Some(58),
      ticket_number: "T-1".to_string(),
      parking_name: "Test".to_string(),
      plate: "ABC123".to_string(),
      vehicle_type: None,
      site: None,
      lane: None,
      booth: None,
      terminal: None,
      operator_name: None,
      issued_at_iso: "2026-01-01T12:00:00Z".to_string(),
      legal_message: None,
      qr_payload: None,
      barcode_payload: None,
      copy_number: Some(1),
      printer_profile: None,
      detail_lines: None,
    };
    let p = crate::printer_profile::resolve_profile(None);
    let b = build_receipt("ENTRY", &t, &p).expect("bytes");
    let s = String::from_utf8_lossy(&b);
    assert!(s.contains("T-1"));
    assert!(s.contains("ABC123"));
  }
}
