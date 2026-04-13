# Certify Print Agent (Local)

This is a local Node.js service that prints PDFs silently to the USB-connected printer.

## Setup

```bash
cd print-agent
npm install
npm start
```

The service runs at `http://127.0.0.1:3100`.

## Endpoints

- `GET /health`
- `GET /printers` -> list installed printers
- `POST /print?printer=Your Printer Name&copies=1`
  - Body: raw `application/pdf`

## Test (PowerShell)

```powershell
$printer = "EPSON L120 Series"
$pdfPath = "C:\path\to\file.pdf"
Invoke-WebRequest -Uri "http://127.0.0.1:3100/print?printer=$([uri]::EscapeDataString($printer))" -Method Post -ContentType "application/pdf" -InFile $pdfPath
```

If `printer` is omitted, the OS default printer is used.
