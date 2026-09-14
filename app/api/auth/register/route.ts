import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { jsonError, jsonOk } from "@/lib/utils";
import { signSession, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";
import { cookies } from "next/headers";

// Public self-registration only ever creates an ADMIN account.
// Employees and department heads are added afterwards by an admin from
// Dashboard → Employees (see /api/employees).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, password, company } = body;

    if (!name || !email || !password) {
      return jsonError("Name, email and password are required.");
    }
    if (password.length < 6) {
      return jsonError("Password must be at least 6 characters.");
    }

    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return jsonError("An account with this email already exists.", 409);
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      department: company || "Administration",
      role: "admin",
    });

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
      },
    });
  } catch (err) {
    console.error(err);
    return jsonError("Something went wrong while registering.", 500);
  }
}
