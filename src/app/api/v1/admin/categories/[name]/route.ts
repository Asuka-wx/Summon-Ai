import { z } from "zod";

import { createErrorResponse } from "@/lib/api-error";
import {
  deleteAdminCategory,
  updateAdminCategory,
} from "@/lib/admin/categories";
import { toAdminAccessErrorResponse } from "@/lib/server/admin-route";
import { toErrorResponse } from "@/lib/server/route-errors";
import { requireAdminSession } from "@/lib/security/admin-access";
import { createValidationErrorResponse, parseJsonBody } from "@/lib/validation";

type AdminCategoryRouteContext = {
  params: Promise<{
    name: string;
  }>;
};

const updateCategorySchema = z
  .object({
    name: z.string().trim().min(1).max(50).optional(),
    sort_order: z.number().int().min(0).optional(),
  })
  .refine((value) => value.name !== undefined || value.sort_order !== undefined, {
    message: "name or sort_order is required.",
    path: ["root"],
  });

export async function PATCH(request: Request, { params }: AdminCategoryRouteContext) {
  try {
    await requireAdminSession();
    const body = await parseJsonBody(request, updateCategorySchema);

    if (!body.success) {
      return createValidationErrorResponse(body.error, "Category update payload is invalid.");
    }

    const { name } = await params;
    const category = await updateAdminCategory({
      currentName: decodeURIComponent(name),
      nextName: body.data.name,
      nextSortOrder: body.data.sort_order,
    });

    return Response.json({ category });
  } catch (error) {
    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: AdminCategoryRouteContext) {
  try {
    await requireAdminSession();
    const { name } = await params;
    const result = await deleteAdminCategory(decodeURIComponent(name));

    return Response.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_task_state") {
      return createErrorResponse(409, "validation_error", "Category is still used by one or more agents.");
    }

    return toAdminAccessErrorResponse(error) ?? toErrorResponse(error);
  }
}
