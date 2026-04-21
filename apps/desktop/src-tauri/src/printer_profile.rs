//! ESC/POS printer profiles for field deployments (Epson, Xprinter, Bixolon, generic).
//! Cut and status queries stay conservative; extend per model after hardware certification.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PrinterProfileId {
  EpsonTmT20Iii,
  Xprinter80GenericEscPos,
  BixolonSrp330Iii,
  BixolonSrp332Ii,
  Generic58mmEscPos,
}

#[derive(Debug, Clone)]
pub struct EscPosProfile {
  pub id: PrinterProfileId,
  cut: &'static [u8],
  status_query: &'static [u8],
}

impl EscPosProfile {
  pub fn cut_bytes(&self) -> &'static [u8] {
    self.cut
  }

  pub fn status_query_bytes(&self) -> &'static [u8] {
    self.status_query
  }

  /// True when the printer answered status and does not report a hard paper-end condition
  /// for GS r 1 style responses (Epson-compatible subset).
  pub fn hardware_ready_after_print(&self, status: Option<u8>) -> bool {
    match status {
      None => false,
      Some(b) => !self.paper_end_gs_r1(b),
    }
  }

  pub fn has_paper_hint_gs_r1(&self, b: u8) -> Option<bool> {
    if self.paper_end_gs_r1(b) {
      return Some(false);
    }
    if self.paper_near_end_gs_r1(b) {
      return Some(true);
    }
    Some(true)
  }

  pub fn status_hint_gs_r1(&self, b: u8) -> Option<String> {
    if self.paper_end_gs_r1(b) {
      return Some("paper_end_detected".to_string());
    }
    if self.paper_near_end_gs_r1(b) {
      return Some("paper_near_end_detected".to_string());
    }
    None
  }

  fn paper_end_gs_r1(&self, b: u8) -> bool {
    let _ = self.id;
    (b & 0b0010_0000) != 0
  }

  fn paper_near_end_gs_r1(&self, b: u8) -> bool {
    let _ = self.id;
    (b & 0b0000_1100) != 0
  }
}

/// Default: GS V 0 full cut; GS r 1 paper sensor status (Epson-style).
const CUT_FULL: &[u8] = &[0x1d, 0x56, 0x00];
const STATUS_GS_R1: &[u8] = &[0x1d, 0x72, 0x01];

fn profile(id: PrinterProfileId, cut: &'static [u8], status: &'static [u8]) -> EscPosProfile {
  EscPosProfile {
    id,
    cut,
    status_query: status,
  }
}

pub fn resolve_profile(raw: Option<&str>) -> EscPosProfile {
  let key = raw.unwrap_or("generic_58mm_esc_pos").trim().to_ascii_lowercase();
  match key.as_str() {
    "epson_tm_t20iii" | "epson-tm-t20iii" => profile(PrinterProfileId::EpsonTmT20Iii, CUT_FULL, STATUS_GS_R1),
    "xprinter_80_generic_esc_pos" | "xprinter-80-generic" => {
      profile(PrinterProfileId::Xprinter80GenericEscPos, CUT_FULL, STATUS_GS_R1)
    }
    "bixolon_srp330iii" | "bixolon-srp-330iii" => profile(PrinterProfileId::BixolonSrp330Iii, CUT_FULL, STATUS_GS_R1),
    "bixolon_srp332ii" | "bixolon-srp-332ii" => profile(PrinterProfileId::BixolonSrp332Ii, CUT_FULL, STATUS_GS_R1),
    "generic_58mm_esc_pos" | "generic-58mm" | "" => {
      profile(PrinterProfileId::Generic58mmEscPos, CUT_FULL, STATUS_GS_R1)
    }
    _ => profile(PrinterProfileId::Generic58mmEscPos, CUT_FULL, STATUS_GS_R1),
  }
}
