import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { jsonError, jsonOk } from "@/lib/utils";
import { signSession, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return jsonError("Email and password are required.");
    }

    await connectDB();

    const user = await User.findOne({ email: email.toLowerCase() }).select("+password");
    if (!user) {
      return jsonError("Invalid email or password.", 401);
    }

    const matches = await bcrypt.compare(password, user.password);
    if (!matches) {
      return jsonError("Invalid email or password.", 401);
    }

    const token = await signSession({
      userId: user._id.toString(),
      role: user.role,
      name: user.name,
      department: user.department,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);

    return jsonOk({
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (err) {
    console.error(err);
    return jsonError("Something went wrong while logging in.", 500);
  }
}
