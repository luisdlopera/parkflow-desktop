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

impl PrinterProfileId {
  pub const DEFAULT: Self = Self::Generic58mmEscPos;
  pub const ALL: [Self; 5] = [
    Self::EpsonTmT20Iii,
    Self::Xprinter80GenericEscPos,
    Self::BixolonSrp330Iii,
    Self::BixolonSrp332Ii,
    Self::Generic58mmEscPos,
  ];

  pub fn canonical_slug(self) -> &'static str {
    match self {
      Self::EpsonTmT20Iii => "epson_tm_t20iii",
      Self::Xprinter80GenericEscPos => "xprinter_80_generic_esc_pos",
      Self::BixolonSrp330Iii => "bixolon_srp330iii",
      Self::BixolonSrp332Ii => "bixolon_srp332ii",
      Self::Generic58mmEscPos => "generic_58mm_esc_pos",
    }
  }

  fn legacy_aliases(self) -> &'static [&'static str] {
    match self {
      Self::EpsonTmT20Iii => &["epson-tm-t20iii"],
      Self::Xprinter80GenericEscPos => &["xprinter-80-generic"],
      Self::BixolonSrp330Iii => &["bixolon-srp-330iii"],
      Self::BixolonSrp332Ii => &["bixolon-srp-332ii"],
      Self::Generic58mmEscPos => &["generic-58mm"],
    }
  }

  pub fn parse(raw: &str) -> Option<Self> {
    let key = raw.trim().to_ascii_lowercase();
    if key.is_empty() {
      return Some(Self::DEFAULT);
    }

    Self::ALL.into_iter().find(|&candidate| {
      key == candidate.canonical_slug()
        || candidate.legacy_aliases().iter().any(|alias| key == *alias)
    })
  }
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
  let input = raw.unwrap_or(PrinterProfileId::DEFAULT.canonical_slug());
  let resolved = PrinterProfileId::parse(input).unwrap_or_else(|| {
    eprintln!(
      "WARN: unknown printer profile '{}'; using {}",
      input,
      PrinterProfileId::DEFAULT.canonical_slug()
    );
    PrinterProfileId::DEFAULT
  });

  match resolved {
    PrinterProfileId::EpsonTmT20Iii
    | PrinterProfileId::Xprinter80GenericEscPos
    | PrinterProfileId::BixolonSrp330Iii
    | PrinterProfileId::BixolonSrp332Ii
    | PrinterProfileId::Generic58mmEscPos => {
      profile(resolved, CUT_FULL, STATUS_GS_R1)
    }
  }
}

#[cfg(test)]
mod tests {
  use super::PrinterProfileId;

  #[test]
  fn parse_accepts_canonical_slugs() {
    assert_eq!(PrinterProfileId::parse("epson_tm_t20iii"), Some(PrinterProfileId::EpsonTmT20Iii));
    assert_eq!(
      PrinterProfileId::parse("xprinter_80_generic_esc_pos"),
      Some(PrinterProfileId::Xprinter80GenericEscPos)
    );
    assert_eq!(
      PrinterProfileId::parse("bixolon_srp330iii"),
      Some(PrinterProfileId::BixolonSrp330Iii)
    );
    assert_eq!(
      PrinterProfileId::parse("bixolon_srp332ii"),
      Some(PrinterProfileId::BixolonSrp332Ii)
    );
    assert_eq!(
      PrinterProfileId::parse("generic_58mm_esc_pos"),
      Some(PrinterProfileId::Generic58mmEscPos)
    );
  }

  #[test]
  fn parse_accepts_legacy_aliases() {
    assert_eq!(PrinterProfileId::parse("epson-tm-t20iii"), Some(PrinterProfileId::EpsonTmT20Iii));
    assert_eq!(
      PrinterProfileId::parse("xprinter-80-generic"),
      Some(PrinterProfileId::Xprinter80GenericEscPos)
    );
    assert_eq!(
      PrinterProfileId::parse("bixolon-srp-330iii"),
      Some(PrinterProfileId::BixolonSrp330Iii)
    );
    assert_eq!(
      PrinterProfileId::parse("bixolon-srp-332ii"),
      Some(PrinterProfileId::BixolonSrp332Ii)
    );
    assert_eq!(PrinterProfileId::parse("generic-58mm"), Some(PrinterProfileId::Generic58mmEscPos));
  }

  #[test]
  fn parse_handles_empty_and_unknown_values() {
    assert_eq!(
      PrinterProfileId::parse("  "),
      Some(PrinterProfileId::Generic58mmEscPos)
    );
    assert_eq!(PrinterProfileId::parse("unknown_model"), None);
  }
}
