import mongoose, { Schema, models, model, Document, Types } from "mongoose";

// A recurring definition a department head sets up once. Calling
// POST /api/task-templates/generate turns each active template into a real
// Task for "today" (skipping days not in `daysOfWeek`, and skipping any
// team member who already has a task from this template today).
export interface ITaskTemplate extends Document {
  title: string;
  description?: string;
  team: Types.ObjectId;
  createdBy: Types.ObjectId;
  assignToAll: boolean; // true = every current team member; false = a single person
  assignedTo?: Types.ObjectId; // used when assignToAll is false
  daysOfWeek: number[]; // 0=Sun .. 6=Sat; empty array = every day
  active: boolean;
  lastGeneratedDate?: string; // ISO date, avoids re-scanning on repeat visits same day
  createdAt: Date;
}

const TaskTemplateSchema = new Schema<ITaskTemplate>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignToAll: { type: Boolean, default: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User" },
    daysOfWeek: { type: [Number], default: [] },
    active: { type: Boolean, default: true },
    lastGeneratedDate: { type: String },
  },
  { timestamps: true }
);

TaskTemplateSchema.index({ team: 1, active: 1 });

export default (models.TaskTemplate as mongoose.Model<ITaskTemplate>) ||
  model<ITaskTemplate>("TaskTemplate", TaskTemplateSchema);
