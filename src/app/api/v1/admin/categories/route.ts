import { z } from "zod";

import { createAdminCategory, listAdminCategories } from "@/lib/admin/categories";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { toErrorResponse } from "@/lib/server/route-errors";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createValidationErrorResponse, parseJsonBody } from "@/lib/validation";

const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(50),
});

export async function GET() {
  try {
    await requireAdminSession();
    const categories = await listAdminCategories();

    return Response.json({
      categories,
    });
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body = await parseJsonBody(request, createCategorySchema);

    if (!body.success) {
      return createValidationErrorResponse(body.error, "Category payload is invalid.");
    }

    const category = await createAdminCategory(body.data.name);

    return Response.json({ category }, { status: 201 });
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
