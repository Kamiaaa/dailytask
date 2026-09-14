import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/utils";

// PATCH { currentPassword, newPassword } -> changes the logged-in user's own password
export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  try {
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return jsonError("Current password and new password are required.");
    }
    if (newPassword.length < 6) {
      return jsonError("New password must be at least 6 characters.");
    }
    if (newPassword === currentPassword) {
      return jsonError("New password must be different from your current password.");
    }

    await connectDB();

    const user = await User.findById(session.userId).select("+password");
    if (!user) return jsonError("User not found.", 404);

    const matches = await bcrypt.compare(currentPassword, user.password);
    if (!matches) {
      return jsonError("Current password is incorrect.", 401);
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return jsonOk({ success: true });
  } catch (err) {
    console.error(err);
    return jsonError("Something went wrong while changing your password.", 500);
  }
}
