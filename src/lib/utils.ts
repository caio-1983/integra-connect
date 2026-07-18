import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Bare digits of a phone number (drops +, spaces, dashes, parentheses). */
export function normalizePhoneDigits(input?: string | null): string {
  return (input ?? "").replace(/\D/g, "");
}

/**
 * Best-effort human-readable phone. BR numbers (55 + DDD + 8/9 digits) get
 * grouped as "+55 21 99999-9999"; other lengths fall back to "+<digits>", and
 * an empty/invalid input returns "".
 */
export function formatPhone(phone?: string | null): string {
  const d = normalizePhoneDigits(phone);
  if (!d) return "";
  const br = d.match(/^55(\d{2})(\d{4,5})(\d{4})$/);
  if (br) return `+55 ${br[1]} ${br[2]}-${br[3]}`;
  if (d.length >= 8 && d.length <= 15) return `+${d}`;
  return phone ?? "";
}

/**
 * Display label for a contact: the real name when present, otherwise a
 * formatted phone number so nameless (e.g. freshly imported) contacts are still
 * recognizable and selectable instead of showing up blank. `fallback` is used
 * only when there is neither a name nor a phone.
 */
export function contactDisplayName(
  name?: string | null,
  phone?: string | null,
  fallback = "Sem nome",
): string {
  const trimmed = (name ?? "").trim();
  if (trimmed) return trimmed;
  return formatPhone(phone) || fallback;
}