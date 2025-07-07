import { NextRequest } from "next/server";
import { getUserById } from "@/lib/db/services/users";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getUserById(params.id);
  if (!user) {
    return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
  }
  return new Response(JSON.stringify(user), { status: 200 });
} 