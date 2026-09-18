"use client";

import { toast } from "sonner";

/**
 * Message sharing helper.
 *
 * The factory WhatsApp groups are picked manually by the user — we never
 * hard-code a target chat. On mobile (and desktop Chrome) we hand the text to
 * the native OS share sheet so the user selects the WhatsApp group themselves.
 * Where the share sheet is unavailable we copy the message to the clipboard so
 * the user can paste it into whichever group they want.
 */

export type ShareOutcome = "shared" | "copied" | "cancelled" | "failed";

export function canUseNativeShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/** Clipboard write with a legacy fallback for non-secure contexts. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the legacy path below */
  }

  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Open the native share sheet (user picks the chat) or fall back to copying.
 * Never throws — returns what actually happened so callers can react.
 */
export async function shareMessage(
  text: string,
  title = "Star Trek Report"
): Promise<ShareOutcome> {
  if (typeof navigator === "undefined") return "failed";

  if (canUseNativeShare()) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (err) {
      // The user dismissed the sheet — not an error worth reporting.
      if (err instanceof DOMException && err.name === "AbortError") return "cancelled";
      // Any other failure falls through to the clipboard.
    }
  }

  return (await copyToClipboard(text)) ? "copied" : "failed";
}

/**
 * shareMessage + consistent toasts, so every share button in the app behaves
 * and reports identically.
 */
export async function shareReportMessage(
  text: string,
  label = "Report"
): Promise<ShareOutcome> {
  const outcome = await shareMessage(text, label);

  if (outcome === "shared") {
    toast.success(`${label} shared`, {
      description: "Message handed to the share sheet — pick the group you want.",
    });
  } else if (outcome === "copied") {
    toast.success(`${label} copied`, {
      description: "Paste it into the WhatsApp group of your choice.",
    });
  } else if (outcome === "failed") {
    toast.error(`Could not share ${label.toLowerCase()}`, {
      description: "Copying to the clipboard was blocked by the browser.",
    });
  }

  return outcome;
}
