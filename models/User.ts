import mongoose, { Schema, models, model, Document } from "mongoose";

export type UserRole = "admin" | "department_head" | "employee";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  department: string;
  avatarUrl?: string;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["admin", "department_head", "employee"],
      default: "employee",
    },
    department: { type: String, required: true, trim: true },
    avatarUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

export default (models.User as mongoose.Model<IUser>) || model<IUser>("User", UserSchema);
