import { NextResponse } from "next/server";
import { getBusinessIdFromSession } from "@/lib/auth";

export async function GET() {
  const businessId = await getBusinessIdFromSession();
  if (!businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ business_id: businessId });
}
