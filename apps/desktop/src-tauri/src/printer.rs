use crate::escpos::{self, TicketDoc};
use crate::PrintDocumentType;
use serde::{Deserialize, Serialize};
use serialport::SerialPort;
use std::io::{Read, Write};
use std::net::{SocketAddr, TcpStream};
use std::time::Duration;

#[derive(Debug, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum PrinterConnection {
  Tcp { host: String, port: u16 },
  /// USB-CDC / RS-232 bridge (e.g. COM3 on Windows).
  Serial { path: String, baud_rate: u32 },
}

#[derive(Debug, Serialize)]
pub struct EscPosPrintOutcome {
  pub bytes_sent: usize,
  /// True only when a status byte was read after the job (weak confirmation; see docs).
  pub hardware_confirmed: bool,
  pub status_byte: Option<u8>,
  pub status_hint: Option<String>,
  pub error: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct PrinterHealthOutcome {
  pub online: bool,
  pub status_byte: Option<u8>,
  pub has_paper: Option<bool>,
  pub status_hint: Option<String>,
  pub error: Option<String>,
}

fn document_type_label(t: &PrintDocumentType) -> &'static str {
  match t {
    PrintDocumentType::Entry => "ENTRY",
    PrintDocumentType::Exit => "EXIT",
    PrintDocumentType::Reprint => "REPRINT",
    PrintDocumentType::LostTicket => "LOST_TICKET",
  }
}

fn query_status_tcp(stream: &mut TcpStream) -> Result<Option<u8>, std::io::Error> {
  stream.write_all(&escpos::paper_status_query_bytes())?;
  stream.flush()?;
  let mut b = [0u8; 1];
  match stream.read(&mut b) {
    Ok(1) => Ok(Some(b[0])),
    Ok(0) | Ok(_) => Ok(None),
    Err(e)
      if e.kind() == std::io::ErrorKind::WouldBlock
        || e.kind() == std::io::ErrorKind::TimedOut =>
    {
      Ok(None)
    }
    Err(e) => Err(e),
  }
}

fn query_status_serial(port: &mut dyn SerialPort) -> Result<Option<u8>, std::io::Error> {
  port.write_all(&escpos::paper_status_query_bytes())?;
  port.flush()?;
  let mut b = [0u8; 1];
  match port.read(&mut b) {
    Ok(1) => Ok(Some(b[0])),
    Ok(0) | Ok(_) => Ok(None),
    Err(e)
      if e.kind() == std::io::ErrorKind::WouldBlock
        || e.kind() == std::io::ErrorKind::TimedOut =>
    {
      Ok(None)
    }
    Err(e) => Err(e),
  }
}

/// Paper end detection is model-specific; expose raw `status_byte` in ops tooling instead of guessing.
fn paper_from_status(b: u8) -> Option<bool> {
  // GS r 1 is not fully standardized across all vendors. These bits are common on Epson-compatible
  // devices: if paper-end or paper-near-end is raised, report no paper.
  let paper_end = (b & 0b0010_0000) != 0;
  let paper_near_end = (b & 0b0000_1100) != 0;
  if paper_end || paper_near_end {
    Some(false)
  } else {
    Some(true)
  }
}

fn status_hint(b: u8) -> Option<String> {
  if (b & 0b0010_0000) != 0 {
    return Some("paper_end_detected".to_string());
  }
  if (b & 0b0000_1100) != 0 {
    return Some("paper_near_end_detected".to_string());
  }
  None
}

pub fn print_ticket_esc_pos(
  conn: &PrinterConnection,
  document_type: &PrintDocumentType,
  ticket_json: &str,
) -> Result<EscPosPrintOutcome, String> {
  let ticket: TicketDoc = serde_json::from_str(ticket_json).map_err(|e| e.to_string())?;
  let label = document_type_label(document_type);
  let bytes = escpos::build_receipt(label, &ticket)?;

  match conn {
    PrinterConnection::Tcp { host, port } => {
      let addr: SocketAddr = format!("{}:{}", host, port)
        .parse()
        .map_err(|e: std::net::AddrParseError| e.to_string())?;
      let mut stream = TcpStream::connect_timeout(&addr, Duration::from_secs(4))
        .map_err(|e| format!("tcp connect: {}", e))?;
      stream
        .set_write_timeout(Some(Duration::from_secs(8)))
        .ok();
      stream
        .set_read_timeout(Some(Duration::from_millis(900)))
        .ok();
      stream
        .write_all(&bytes)
        .map_err(|e| format!("tcp write: {}", e))?;
      stream.flush().map_err(|e| format!("tcp flush: {}", e))?;
      let status = query_status_tcp(&mut stream).map_err(|e| format!("tcp status: {}", e))?;
      let confirmed = status.is_some();
      Ok(EscPosPrintOutcome {
        bytes_sent: bytes.len(),
        hardware_confirmed: confirmed,
        status_byte: status,
        status_hint: status.and_then(status_hint),
        error: None,
      })
    }
    PrinterConnection::Serial { path, baud_rate } => {
      let mut port = serialport::new(path, *baud_rate)
        .timeout(Duration::from_millis(1200))
        .open()
        .map_err(|e| format!("serial open: {}", e))?;
      port
        .write_all(&bytes)
        .map_err(|e| format!("serial write: {}", e))?;
      port.flush().map_err(|e| format!("serial flush: {}", e))?;
      let status = query_status_serial(port.as_mut()).map_err(|e| format!("serial status: {}", e))?;
      let confirmed = status.is_some();
      Ok(EscPosPrintOutcome {
        bytes_sent: bytes.len(),
        hardware_confirmed: confirmed,
        status_byte: status,
        status_hint: status.and_then(status_hint),
        error: None,
      })
    }
  }
}

pub fn printer_health_esc_pos(conn: &PrinterConnection) -> PrinterHealthOutcome {
  match conn {
    PrinterConnection::Tcp { host, port } => {
      let addr: SocketAddr = match format!("{}:{}", host, port).parse() {
        Ok(a) => a,
        Err(e) => {
          return PrinterHealthOutcome {
            online: false,
            status_byte: None,
            has_paper: None,
            status_hint: None,
            error: Some(e.to_string()),
          };
        }
      };
      let mut stream = match TcpStream::connect_timeout(&addr, Duration::from_secs(3)) {
        Ok(s) => s,
        Err(e) => {
          return PrinterHealthOutcome {
            online: false,
            status_byte: None,
            has_paper: None,
            status_hint: None,
            error: Some(format!("tcp: {}", e)),
          };
        }
      };
      stream.set_read_timeout(Some(Duration::from_millis(900))).ok();
      match query_status_tcp(&mut stream) {
        Ok(Some(b)) => PrinterHealthOutcome {
          online: true,
          status_byte: Some(b),
          has_paper: paper_from_status(b),
          status_hint: status_hint(b),
          error: None,
        },
        Ok(None) => PrinterHealthOutcome {
          online: true,
          status_byte: None,
          has_paper: None,
          status_hint: None,
          error: Some("printer did not return status byte".to_string()),
        },
        Err(e) => PrinterHealthOutcome {
          online: true,
          status_byte: None,
          has_paper: None,
          status_hint: None,
          error: Some(e.to_string()),
        },
      }
    }
    PrinterConnection::Serial { path, baud_rate } => {
      let mut port = match serialport::new(path, *baud_rate)
        .timeout(Duration::from_millis(1200))
        .open()
      {
        Ok(p) => p,
        Err(e) => {
          return PrinterHealthOutcome {
            online: false,
            status_byte: None,
            has_paper: None,
            status_hint: None,
            error: Some(format!("serial: {}", e)),
          };
        }
      };
      match query_status_serial(port.as_mut()) {
        Ok(Some(b)) => PrinterHealthOutcome {
          online: true,
          status_byte: Some(b),
          has_paper: paper_from_status(b),
          status_hint: status_hint(b),
          error: None,
        },
        Ok(None) => PrinterHealthOutcome {
          online: true,
          status_byte: None,
          has_paper: None,
          status_hint: None,
          error: Some("printer did not return status byte".to_string()),
        },
        Err(e) => PrinterHealthOutcome {
          online: true,
          status_byte: None,
          has_paper: None,
          status_hint: None,
          error: Some(e.to_string()),
        },
      }
    }
  }
}
