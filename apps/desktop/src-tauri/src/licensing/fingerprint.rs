use sha2::{Digest, Sha256};
use std::process::Command;

/// Genera un fingerprint único y estable del dispositivo.
/// Combina múltiples identificadores de hardware para dificultar
/// la clonación de licencias.
pub fn get_device_fingerprint() -> Result<String, String> {
  let mut hasher = Sha256::new();

  // Hostname
  if let Ok(hostname) = get_hostname() {
    hasher.update(hostname.as_bytes());
  }

  // Información del sistema operativo
  if let Ok(os_info) = get_os_info() {
    hasher.update(os_info.as_bytes());
  }

  // Información del CPU (si disponible)
  if let Ok(cpu_info) = get_cpu_info() {
    hasher.update(cpu_info.as_bytes());
  }

  // MAC address principal
  if let Ok(mac) = get_primary_mac() {
    hasher.update(mac.as_bytes());
  }

  // ID de volumen/disco (Windows) o serial (Linux/Mac)
  if let Ok(disk_id) = get_disk_identifier() {
    hasher.update(disk_id.as_bytes());
  }

  // ID de placa base (si disponible)
  if let Ok(motherboard) = get_motherboard_id() {
    hasher.update(motherboard.as_bytes());
  }

  let result = hasher.finalize();
  Ok(format!("fp-{:x}", result))
}

fn get_hostname() -> Result<String, String> {
  #[cfg(target_os = "windows")]
  {
    Command::new("hostname")
      .output()
      .map_err(|e| e.to_string())
      .and_then(|out| {
        String::from_utf8(out.stdout)
          .map(|s| s.trim().to_string())
          .map_err(|e| e.to_string())
      })
  }

  #[cfg(not(target_os = "windows"))]
  {
    Command::new("hostname")
      .output()
      .map_err(|e| e.to_string())
      .and_then(|out| {
        String::from_utf8(out.stdout)
          .map(|s| s.trim().to_string())
          .map_err(|e| e.to_string())
      })
  }
}

fn get_os_info() -> Result<String, String> {
  let os = std::env::consts::OS;
  let arch = std::env::consts::ARCH;

  #[cfg(target_os = "windows")]
  {
    // Obtener versión de Windows
    if let Ok(output) = Command::new("cmd").args(["/C", "ver"]).output() {
      if let Ok(ver) = String::from_utf8(output.stdout) {
        return Ok(format!("{}-{}-{}", os, arch, ver.trim()));
      }
    }
  }

  #[cfg(target_os = "linux")]
  {
    if let Ok(output) = Command::new("uname").args(["-a"]).output() {
      if let Ok(info) = String::from_utf8(output.stdout) {
        return Ok(format!("{}-{}-{}", os, arch, info.trim()));
      }
    }
  }

  #[cfg(target_os = "macos")]
  {
    if let Ok(output) = Command::new("uname").args(["-a"]).output() {
      if let Ok(info) = String::from_utf8(output.stdout) {
        return Ok(format!("{}-{}-{}", os, arch, info.trim()));
      }
    }
  }

  Ok(format!("{}-{}", os, arch))
}

fn get_cpu_info() -> Result<String, String> {
  #[cfg(target_os = "windows")]
  {
    Command::new("wmic")
      .args(["cpu", "get", "ProcessorId", "/value"])
      .output()
      .map_err(|e| e.to_string())
      .and_then(|out| {
        String::from_utf8(out.stdout)
          .map(|s| {
            s.lines()
              .find(|l| l.contains("ProcessorId"))
              .map(|l| l.split('=').nth(1).unwrap_or("").trim().to_string())
              .unwrap_or_else(|| "unknown".to_string())
          })
          .map_err(|e| e.to_string())
      })
  }

  #[cfg(target_os = "linux")]
  {
    std::fs::read_to_string("/proc/cpuinfo")
      .map_err(|e| e.to_string())
      .map(|content| {
        content
          .lines()
          .find(|l| l.starts_with("serial") || l.starts_with("Serial"))
          .map(|l| l.split(':').nth(1).unwrap_or("").trim().to_string())
          .unwrap_or_else(|| {
            // Fallback: usar model name
            content
              .lines()
              .find(|l| l.starts_with("model name"))
              .map(|l| l.split(':').nth(1).unwrap_or("").trim().to_string())
              .unwrap_or_else(|| "unknown".to_string())
          })
      })
  }

  #[cfg(target_os = "macos")]
  {
    Command::new("sysctl")
      .args(["-n", "machdep.cpu.brand_string"])
      .output()
      .map_err(|e| e.to_string())
      .and_then(|out| {
        String::from_utf8(out.stdout)
          .map(|s| s.trim().to_string())
          .map_err(|e| e.to_string())
      })
  }

  #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
  {
    Err("Unsupported OS".to_string())
  }
}

fn get_primary_mac() -> Result<String, String> {
  // Intentar obtener MAC de la interfaz principal
  #[cfg(target_os = "windows")]
  {
    Command::new("wmic")
      .args(["nic", "where", "NetEnabled=true", "get", "MACAddress", "/value"])
      .output()
      .map_err(|e| e.to_string())
      .and_then(|out| {
        String::from_utf8(out.stdout)
          .map(|s| {
            s.lines()
              .find(|l| l.contains("MACAddress"))
              .map(|l| l.split('=').nth(1).unwrap_or("").trim().to_string())
              .unwrap_or_else(|| "00:00:00:00:00:00".to_string())
          })
          .map_err(|e| e.to_string())
      })
  }

  #[cfg(target_os = "linux")]
  {
    // Leer MAC de /sys/class/net/eth0/address o similar
    let interfaces = ["eth0", "enp0s3", "ens33", "wlan0", "en0"];
    for iface in &interfaces {
      let path = format!("/sys/class/net/{}/address", iface);
      if let Ok(mac) = std::fs::read_to_string(&path) {
        return Ok(mac.trim().to_string());
      }
    }
    Err("Could not find network interface".to_string())
  }

  #[cfg(target_os = "macos")]
  {
    Command::new("ifconfig")
      .args(["en0"])
      .output()
      .map_err(|e| e.to_string())
      .and_then(|out| {
        String::from_utf8(out.stdout)
          .map(|s| {
            s.lines()
              .find(|l| l.contains("ether"))
              .map(|l| {
                l.split_whitespace()
                  .nth(1)
                  .unwrap_or("")
                  .to_string()
              })
              .unwrap_or_else(|| "00:00:00:00:00:00".to_string())
          })
          .map_err(|e| e.to_string())
      })
  }

  #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
  {
    Err("Unsupported OS".to_string())
  }
}

fn get_disk_identifier() -> Result<String, String> {
  #[cfg(target_os = "windows")]
  {
    Command::new("wmic")
      .args(["diskdrive", "get", "SerialNumber", "/value"])
      .output()
      .map_err(|e| e.to_string())
      .and_then(|out| {
        String::from_utf8(out.stdout)
          .map(|s| {
            s.lines()
              .find(|l| l.contains("SerialNumber"))
              .map(|l| l.split('=').nth(1).unwrap_or("").trim().to_string())
              .unwrap_or_else(|| "unknown".to_string())
          })
          .map_err(|e| e.to_string())
      })
  }

  #[cfg(target_os = "linux")]
  {
    // Intentar obtener UUID del disco raíz
    if let Ok(output) = Command::new("lsblk")
      .args(["-dno", "UUID", "/dev/sda"])
      .output() {
      if let Ok(uuid) = String::from_utf8(output.stdout) {
        let uuid = uuid.trim();
        if !uuid.is_empty() {
          return Ok(uuid.to_string());
        }
      }
    }

    // Fallback: usar machine-id
    std::fs::read_to_string("/etc/machine-id")
      .or_else(|_| std::fs::read_to_string("/var/lib/dbus/machine-id"))
      .map(|s| s.trim().to_string())
      .map_err(|e| e.to_string())
  }

  #[cfg(target_os = "macos")]
  {
    Command::new("system_profiler")
      .args(["SPHardwareDataType"])
      .output()
      .map_err(|e| e.to_string())
      .and_then(|out| {
        String::from_utf8(out.stdout)
          .map(|s| {
            s.lines()
              .find(|l| l.contains("Hardware UUID"))
              .map(|l| l.split(':').nth(1).unwrap_or("").trim().to_string())
              .unwrap_or_else(|| "unknown".to_string())
          })
          .map_err(|e| e.to_string())
      })
  }

  #[cfg(not(any(target_os = "windows", target_os = "linux", target_os = "macos")))]
  {
    Err("Unsupported OS".to_string())
  }
}

#[cfg(test)]
mod tests {
  use super::get_device_fingerprint;

  #[test]
  fn generates_stable_fingerprint_format() {
    let first = get_device_fingerprint().expect("fingerprint should be generated");
    let second = get_device_fingerprint().expect("fingerprint should be generated");

    assert!(first.starts_with("fp-"));
    assert_eq!(first, second);
    assert!(first.len() > 16);
  }
}

fn get_motherboard_id() -> Result<String, String> {
  #[cfg(target_os = "windows")]
  {
    Command::new("wmic")
      .args(["baseboard", "get", "SerialNumber", "/value"])
      .output()
      .map_err(|e| e.to_string())
      .and_then(|out| {
        String::from_utf8(out.stdout)
          .map(|s| {
            s.lines()
              .find(|l| l.contains("SerialNumber"))
              .map(|l| l.split('=').nth(1).unwrap_or("").trim().to_string())
              .unwrap_or_else(|| "unknown".to_string())
          })
          .map_err(|e| e.to_string())
      })
  }

  #[cfg(not(target_os = "windows"))]
  {
    // En Linux/Mac no hay un identificador estándar de placa base
    Err("Not available on this platform".to_string())
  }
}

/// Obtener información completa del dispositivo para registro
pub fn get_device_info() -> Result<DeviceInfo, String> {
  Ok(DeviceInfo {
    fingerprint: get_device_fingerprint()?,
    hostname: get_hostname().unwrap_or_else(|_| "unknown".to_string()),
    operating_system: std::env::consts::OS.to_string(),
    cpu_info: get_cpu_info().unwrap_or_else(|_| "unknown".to_string()),
    mac_address: get_primary_mac().unwrap_or_else(|_| "00:00:00:00:00:00".to_string()),
  })
}

/// Información del dispositivo
#[derive(Debug, Clone, serde::Serialize)]
pub struct DeviceInfo {
  pub fingerprint: String,
  pub hostname: String,
  pub operating_system: String,
  pub cpu_info: String,
  pub mac_address: String,
}
