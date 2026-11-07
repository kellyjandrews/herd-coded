function forbidden(): Response {
  return Response.json(
    { error: "Cross-origin requests are not allowed." },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}

export function crossOriginResponse(request: Request): Response | null {
  if (request.headers.get("sec-fetch-site") === "cross-site") return forbidden();
  const origin = request.headers.get("origin");
  if (!origin) return forbidden();
  try {
    if (new URL(origin).origin !== new URL(request.url).origin) return forbidden();
  } catch {
    return forbidden();
  }
  return null;
}
