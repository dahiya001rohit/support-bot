import { NextResponse } from "next/server";
import { getBusinessIdFromSession } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api-handler";

export async function GET() {
  return withErrorHandler(async () => {
    const businessId = await getBusinessIdFromSession();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ business_id: businessId });
  });
}
