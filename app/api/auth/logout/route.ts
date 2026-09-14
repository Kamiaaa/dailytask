import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/lib/auth";
import { jsonOk } from "@/lib/utils";

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return jsonOk({ success: true });
}
