import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { getSession } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/utils";

// GET: list employees (any authenticated user; department heads use this to build their team)
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);

  await connectDB();

  const { searchParams } = new URL(req.url);
  const department = searchParams.get("department");
  const role = searchParams.get("role");
  const search = searchParams.get("search");

  const filter: Record<string, unknown> = {};
  if (department) filter.department = department;
  if (role) filter.role = role;
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "i");
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const employees = await User.find(filter).select("-password").sort({ name: 1 });
  return jsonOk({ employees });
}

// POST: create an employee/department_head account (admin only)
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return jsonError("Unauthorized", 401);
  if (session.role !== "admin") return jsonError("Only admins can add employees.", 403);

  try {
    const { name, email, password, department, role } = await req.json();
    if (!name || !email || !password || !department) {
      return jsonError("Name, email, password and department are required.");
    }

    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return jsonError("An account with this email already exists.", 409);

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashed,
      department,
      role: role === "department_head" ? "department_head" : "employee",
    });

    return jsonOk(
      {
        employee: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
        },
      },
      201
    );
  } catch (err) {
    console.error(err);
    return jsonError("Something went wrong while creating the employee.", 500);
  }
}
