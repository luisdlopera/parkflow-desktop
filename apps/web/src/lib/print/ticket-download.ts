"use client";

export function downloadTicketAsHtml(lines: string[], ticketNumber: string, plate: string): void {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ticket ${ticketNumber}</title>
  <style>
    @page { margin: 0; }
    body {
      margin: 0;
      padding: 16px;
      font-family: 'Courier New', Courier, monospace;
      font-size: 12px;
      line-height: 1.4;
      color: #000;
    }
    pre {
      margin: 0;
      white-space: pre;
      font-family: inherit;
      font-size: inherit;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <pre>${lines.join("\n")}</pre>
  <script>window.print()</script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ticket-${ticketNumber}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
