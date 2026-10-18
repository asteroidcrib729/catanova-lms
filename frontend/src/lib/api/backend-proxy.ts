/** Server-only HTTP relay. Database credentials never belong in this module. */
const MAX_BODY_BYTES = 65_536;
const REQUEST_HEADERS = [
  "accept",
  "content-type",
  "origin",
  "x-csrf-token",
  "idempotency-key",
  "x-request-id",
];
const RESPONSE_HEADERS = [
  "content-type",
  "retry-after",
  "server-timing",
  "x-request-id",
  "idempotency-replayed",
];

function failure(status: number, code: string, message: string): Response {
  return Response.json(
    { code, message },
    {
      status,
      headers: { "Cache-Control": "private, no-store", Vary: "Cookie, Origin" },
    },
  );
}

function backendOrigin(): string {
  const configured =
    process.env.BACKEND_API_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://127.0.0.1:8000"
      : undefined);
  if (!configured) throw new Error("Backend origin is not configured.");
  return configuredOrigin(configured);
}

function configuredOrigin(value: string): string {
  const url = new URL(value);
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (
    (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("Invalid backend origin.");
  }
  return url.origin;
}

async function boundedBody(request: Request): Promise<ArrayBuffer | undefined> {
  const declared = request.headers.get("content-length");
  if (
    declared &&
    (!/^\d+$/.test(declared) || Number(declared) > MAX_BODY_BYTES)
  ) {
    throw new RangeError("Body limit exceeded.");
  }
  if (!request.body) return undefined;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY_BYTES) {
        await reader.cancel();
        throw new RangeError("Body limit exceeded.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

export async function forwardToBackend(
  request: Request,
  segments: string[],
  target: "api" | "health" = "api",
): Promise<Response> {
  if (
    !segments.length ||
    segments.some(
      (segment) =>
        !/^[A-Za-z0-9_.-]+$/.test(segment) ||
        segment === "." ||
        segment === "..",
    )
  ) {
    return failure(400, "invalid_path", "Invalid library API path.");
  }
  if (
    target === "health" &&
    (segments.length !== 1 || !["live", "ready"].includes(segments[0]))
  ) {
    return failure(404, "not_found", "Unknown health check.");
  }
  const method = request.method.toUpperCase();
  const safe = ["GET", "HEAD"].includes(method);
  if (
    (!safe && target === "health") ||
    !["GET", "HEAD", "POST", "PATCH", "PUT", "DELETE"].includes(method)
  ) {
    return failure(
      405,
      "method_not_allowed",
      "Unsupported library API method.",
    );
  }
  const incoming = new URL(request.url);
  let canonicalOrigin: string;
  try {
    if (process.env.NODE_ENV === "production" && !process.env.APP_ORIGIN) {
      throw new Error("Production dashboard origin is required.");
    }
    canonicalOrigin = process.env.APP_ORIGIN
      ? configuredOrigin(process.env.APP_ORIGIN)
      : incoming.origin;
  } catch {
    return failure(
      503,
      "frontend_not_configured",
      "The dashboard origin is not configured.",
    );
  }
  if (!safe && request.headers.get("origin") !== canonicalOrigin) {
    return failure(
      403,
      "origin_rejected",
      "A same-origin browser request is required.",
    );
  }
  let origin: string;
  try {
    origin = backendOrigin();
  } catch {
    return failure(
      503,
      "backend_not_configured",
      "The library backend is not configured.",
    );
  }
  const headers = new Headers();
  for (const name of REQUEST_HEADERS) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  const cookieNames = new Set([
    process.env.LMS_SESSION_COOKIE || "lms_session",
    process.env.NEXT_PUBLIC_CSRF_COOKIE_NAME || "lms_csrf",
  ]);
  const cookies = (request.headers.get("cookie") || "")
    .split(";")
    .map((value) => value.trim())
    .filter((value) => cookieNames.has(value.split("=", 1)[0]));
  if (cookies.length) headers.set("cookie", cookies.join("; "));
  let body: ArrayBuffer | undefined;
  try {
    body = safe ? undefined : await boundedBody(request);
  } catch (error) {
    return failure(
      error instanceof RangeError ? 413 : 400,
      "invalid_body",
      "Invalid request body.",
    );
  }
  const path = target === "health" ? "/health/" : "/api/v1/";
  const destination = new URL(
    path + segments.map(encodeURIComponent).join("/"),
    origin,
  );
  destination.search = incoming.search;
  try {
    // Exactly one upstream attempt. The client retains the idempotency key for
    // an explicit retry; a disconnected request may already have committed.
    const upstream = await fetch(destination, {
      method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(18_000)]),
    });
    if (upstream.status >= 300 && upstream.status < 400) {
      await upstream.body?.cancel();
      return failure(502, "upstream_redirect", "Unexpected backend redirect.");
    }
    const responseHeaders = new Headers({
      "Cache-Control": "private, no-store",
      Vary: "Cookie, Origin",
    });
    for (const name of RESPONSE_HEADERS) {
      const value = upstream.headers.get(name);
      if (value !== null) responseHeaders.set(name, value);
    }
    // Preserve each Set-Cookie separately, including HttpOnly/Secure/SameSite.
    // Host-only cookies are now scoped to the dashboard, not onrender.com.
    for (const cookie of upstream.headers.getSetCookie()) {
      if (/;\s*domain=/i.test(cookie)) {
        await upstream.body?.cancel();
        return failure(
          502,
          "invalid_upstream_cookie",
          "Unexpected backend cookie scope.",
        );
      }
      responseHeaders.append("set-cookie", cookie);
    }
    return new Response(method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return failure(
      503,
      "service_warming",
      "The library backend is temporarily unavailable. Please retry.",
    );
  }
}
