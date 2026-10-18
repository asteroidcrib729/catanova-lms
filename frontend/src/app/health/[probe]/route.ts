import { forwardToBackend } from "@/lib/api/backend-proxy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ probe: string }> },
) {
  const { probe } = await context.params;
  return forwardToBackend(request, [probe], "health");
}
