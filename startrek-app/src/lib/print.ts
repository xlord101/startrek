"use client";

/**
 * Universal Isolated Print Engine.
 *
 * Spawns an isolated offscreen iframe with synchronously copied stylesheet rules
 * and the target element HTML. This completely bypasses modal/dialog positioning quirks,
 * transforms (-translate-x-1/2), overflow clipping, and backdrop filters,
 * ensuring 100% reliable, full-color printing across all browsers (Brave, Chrome, Edge, Safari, Mobile).
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeDomId(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_-]/g, "");
  return safe || "printable-section";
}

export function printElementDirectly(elementId: string, title = "KD EXPORT Document") {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const elem = document.getElementById(elementId);
  if (!elem) {
    window.print();
    return;
  }

  const safeTitle = escapeHtml(String(title || "KD EXPORT Document"));
  const safeId = sanitizeDomId(elementId);

  // Remove any stale print frame
  const oldFrame = document.getElementById("kd-isolated-print-frame");
  if (oldFrame) {
    try {
      oldFrame.remove();
    } catch {
      /* ignore */
    }
  }

  // Create real-dimensioned off-screen iframe (210mm x 297mm A4)
  // CRITICAL: Must NOT be 0x0 or opacity: 0 because Chromium/Brave skips layout calculation on zero-area iframes.
  const iframe = document.createElement("iframe");
  iframe.id = "kd-isolated-print-frame";
  iframe.style.position = "absolute";
  iframe.style.top = "-99999px";
  iframe.style.left = "-99999px";
  iframe.style.width = "210mm";
  iframe.style.minHeight = "297mm";
  iframe.style.border = "none";
  iframe.style.zIndex = "-9999";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  // 1. Collect synchronous CSS rules directly from document.styleSheets
  let embeddedCss = "";
  try {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        if (sheet.cssRules) {
          for (const rule of Array.from(sheet.cssRules)) {
            embeddedCss += rule.cssText + "\n";
          }
        }
      } catch {
        // Cross-origin stylesheet security restriction - fallback to link tags below
      }
    }
  } catch {
    /* ignore */
  }

  // 2. Also collect all link[rel='stylesheet'] tags as fallback
  const linkTags = Array.from(document.querySelectorAll("link[rel='stylesheet']"))
    .map((node) => node.outerHTML)
    .join("\n");

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${safeTitle}</title>
        ${linkTags}
        <style>
          ${embeddedCss}
        </style>
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
          #${safeId} {
            display: block !important;
            visibility: visible !important;
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
          #${safeId} * {
            visibility: visible !important;
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
        <div style="padding: 2mm 0; width: 100%;">
          ${elem.outerHTML}
        </div>
      </body>
    </html>
  `);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error("Print execution error, falling back to window.print():", err);
      window.print();
    }
  };

  // Wait for all images inside the iframe to load before printing
  const images = Array.from(doc.images);
  if (images.length > 0) {
    let pending = images.length;
    let printed = false;

    const onComplete = () => {
      pending--;
      if (pending <= 0 && !printed) {
        printed = true;
        setTimeout(triggerPrint, 100);
      }
    };

    images.forEach((img) => {
      if (img.complete) {
        onComplete();
      } else {
        img.onload = onComplete;
        img.onerror = onComplete;
      }
    });

    // Safety timeout in case an image is slow or blocked
    setTimeout(() => {
      if (!printed) {
        printed = true;
        triggerPrint();
      }
    }, 800);
  } else {
    setTimeout(triggerPrint, 200);
  }

  // Cleanup after printing is finished
  if (iframe.contentWindow) {
    iframe.contentWindow.addEventListener("afterprint", () => {
      setTimeout(() => {
        try {
          iframe.remove();
        } catch {
          /* ignore */
        }
      }, 1000);
    });
  }
}


