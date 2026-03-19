import { createErrorResponse } from "@/lib/api-error";
import {
  createSellerAgent,
  listSellerAgents,
} from "@/lib/seller/agents";
import { getCurrentUserProfile } from "@/lib/server/current-user";
import { toErrorResponse } from "@/lib/server/route-errors";

export async function GET() {
  try {
    const currentUser = await getCurrentUserProfile();
    const agents = await listSellerAgents(currentUser.id);

    return Response.json({
      agents,
    });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await getCurrentUserProfile();

    if (currentUser.is_frozen) {
      throw new Error("account_frozen");
    }

    const body = (await request.json()) as {
      name?: string;
      tagline?: string;
      description?: string;
      categories?: string[];
      supported_languages?: string[];
      price_per_call?: number;
    };

    if (
      !body.name ||
      !body.tagline ||
      !body.description ||
      !Array.isArray(body.categories) ||
      body.categories.length === 0 ||
      typeof body.price_per_call !== "number" ||
      body.price_per_call < 0
    ) {
      return createErrorResponse(400, "validation_error", "Seller agent payload is invalid.", {
        name: "Expected name, tagline, description, categories, and non-negative price_per_call.",
      });
    }

    const result = await createSellerAgent({
      ownerId: currentUser.id,
      name: body.name.trim(),
      tagline: body.tagline.trim(),
      description: body.description.trim(),
      categories: body.categories,
      supportedLanguages:
        Array.isArray(body.supported_languages) && body.supported_languages.length > 0
          ? body.supported_languages
          : ["en"],
      pricePerCall: body.price_per_call,
    });

    return Response.json(result, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
