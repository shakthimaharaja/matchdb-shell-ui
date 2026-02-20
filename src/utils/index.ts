/**
 * Shell-UI Shared Utilities
 * Common helper functions used across Shell-UI components and pages.
 */

/** Build an Authorization header object for axios requests. */
export const authHeader = (token: string | null) =>
  token ? { headers: { Authorization: `Bearer ${token}` } } : {};

/**
 * Trigger a file download from a Blob response.
 * @param blob       The Blob data to download.
 * @param fallback   Fallback filename if content-disposition is missing.
 * @param disposition The Content-Disposition header value (optional).
 */
export function downloadBlob(
  blob: Blob,
  fallback: string,
  disposition?: string,
): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const match = disposition?.match(/filename="?([^"]+)"?/);
  a.download = match?.[1] || fallback;
  a.click();
  URL.revokeObjectURL(url);
}

/** Format a number as currency (e.g. $50). Returns "—" for null/undefined. */
export const fmtCurrency = (v: number | null | undefined, prefix = "$") =>
  v != null ? `${prefix}${Number(v).toLocaleString()}` : "—";

/** Format an ISO date string to a short readable form. */
export const fmtDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
};
