"use client";

/**
 * Universal Isolated Print Engine.
 *
 * Spawns an isolated invisible iframe with copied document styles and
 * the target element HTML. This completely bypasses modal/dialog positioning quirks,
 * transforms (-translate-x-1/2), overflow clipping, and backdrop filters,
 * ensuring 100% reliable, full-color printing across all browsers (Chrome, Brave, Edge, Safari, Mobile).
 */
export function printElementDirectly(elementId: string, title = "KD EXPORT Document") {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const elem = document.getElementById(elementId);
  if (!elem) {
    window.print();
    return;
  }

  // Remove any stale print frame
  const oldFrame = document.getElementById("kd-isolated-print-frame");
  if (oldFrame) {
    try {
      oldFrame.remove();
    } catch {
      /* ignore */
    }
  }

  const iframe = document.createElement("iframe");
  iframe.id = "kd-isolated-print-frame";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "none";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  // Collect all link and style elements to retain identical Tailwind styling & fonts
  const styles = Array.from(document.querySelectorAll("link[rel='stylesheet'], style"))
    .map((node) => node.outerHTML)
    .join("\n");

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${title}</title>
        ${styles}
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important;
          }
          #${elementId} {
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 4mm !important;
            border: 1px solid #cbd5e1 !important;
            border-radius: 8px !important;
            box-shadow: none !important;
            background: #ffffff !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print,
          .print-hidden,
          .print\\:hidden,
          button {
            display: none !important;
          }
        </style>
      </head>
      <body>
        <div style="padding: 2mm 0;">
          ${elem.outerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  // Give stylesheets 250ms to parse into the iframe document before triggering print
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error("Print frame execution failed, falling back to window.print():", err);
      window.print();
    }
  }, 300);
}
