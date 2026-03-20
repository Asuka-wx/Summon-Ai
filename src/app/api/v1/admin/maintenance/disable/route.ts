import { POST as updateMaintenanceMode } from "@/app/api/v1/admin/maintenance/route";

export async function POST(request: Request) {
  return updateMaintenanceMode(
    new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body: JSON.stringify({ enabled: false }),
    }),
  );
}
