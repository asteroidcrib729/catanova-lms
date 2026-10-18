import { forwardToBackend } from "@/lib/api/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  return forwardToBackend(request, path);
}

export {
  handle as GET,
  handle as HEAD,
  handle as POST,
  handle as PATCH,
  handle as PUT,
  handle as DELETE,
};
