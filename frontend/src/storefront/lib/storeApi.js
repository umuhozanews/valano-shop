// Dedicated client for the public storefront endpoints.
//
// The dashboard's utils/api.js silently falls back to an in-browser mock engine
// when a request fails, which would make a shopper see a fake store instead of
// an honest "not found". Public pages therefore talk to the backend directly and
// surface real failures.

const BASE = ((import.meta.env.VITE_API_URL || "/api").trim() || "/api").replace(/\/$/, "");

export class StoreApiError extends Error {
  constructor(message, { status = 0, code = "STORE_REQUEST_FAILED" } = {}) {
    super(message);
    this.name = "StoreApiError";
    this.status = status;
    this.code = code;
  }
}

async function readError(response, fallback) {
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Non-JSON body (HTML error page, empty response) — keep the fallback text.
  }
  return new StoreApiError(payload?.error || fallback, {
    status: response.status,
    code: payload?.code || `HTTP_${response.status}`,
  });
}

export async function fetchStore(slug, { signal } = {}) {
  let response;
  try {
    response = await fetch(`${BASE}/shop/${encodeURIComponent(slug)}`, {
      signal,
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new StoreApiError("We could not reach the shop. Check your connection and try again.", {
      code: "NETWORK_ERROR",
    });
  }

  if (!response.ok) throw await readError(response, "This shop is not available right now.");
  return response.json();
}

export async function placeStoreOrder(slug, payload) {
  let response;
  try {
    response = await fetch(`${BASE}/shop/${encodeURIComponent(slug)}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new StoreApiError("We could not send your order. Check your connection and try again.", {
      code: "NETWORK_ERROR",
    });
  }

  if (!response.ok) throw await readError(response, "We could not place your order. Please try again.");
  return response.json();
}
