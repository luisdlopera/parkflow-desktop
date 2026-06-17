export function formatISODate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export function parseFormattedDate(formatted: string): string {
  try {
    const [day, month, year] = formatted.split("/");
    return `${year}-${month}-${day}`;
  } catch {
    return formatted;
  }
}

export function isValidDateRange(from: string, to: string): boolean {
  try {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return fromDate <= toDate;
  } catch {
    return false;
  }
}
