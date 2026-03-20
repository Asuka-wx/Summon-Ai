import { buildAuthenticatedSseUrl } from "@/lib/realtime/sse-url";
import { toErrorResponse } from "@/lib/server/route-errors";

type TaskStreamRouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, { params }: TaskStreamRouteContext) {
  try {
    const { id } = await params;
    const url = await buildAuthenticatedSseUrl({
      taskId: id,
    });

    return Response.redirect(url, 307);
  } catch (error) {
    return toErrorResponse(error);
  }
}
