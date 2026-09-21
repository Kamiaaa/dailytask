import mongoose, { Schema, models, model, Document, Types } from "mongoose";

// pending    -> employee hasn't submitted the task yet
// submitted  -> employee marked it done, awaiting the department head's review
// approved   -> department head approved it; this is the only status that counts toward score
// rejected   -> department head rejected it; the employee does not get the point,
//               but can revise and resubmit (back to "submitted")
export type TaskStatus = "pending" | "submitted" | "approved" | "rejected";

export interface ITask extends Document {
  title: string;
  description?: string;
  team: Types.ObjectId;
  assignedTo: Types.ObjectId;
  assignedBy: Types.ObjectId;
  date: string; // ISO date (yyyy-mm-dd) the task is scheduled for
  status: TaskStatus;
  points: number; // always 1, kept explicit for clarity/extensibility
  submittedAt?: Date;
  reviewedAt?: Date;
  reviewedBy?: Types.ObjectId;
  reviewNote?: string;
  // Evidence the employee attaches when submitting. proofUrl is a Cloudinary
  // secure URL (image, PDF, doc…); proofName is the original filename so the
  // reviewer sees something friendlier than the Cloudinary public id.
  proofUrl?: string;
  proofName?: string;
  proofType?: "image" | "file";
  proofNote?: string;
  template?: Types.ObjectId; // set when this task was auto-generated from a TaskTemplate
  createdAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    team: { type: Schema.Types.ObjectId, ref: "Team", required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    date: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "submitted", "approved", "rejected"],
      default: "pending",
    },
    points: { type: Number, default: 1 },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewNote: { type: String, trim: true, default: "" },
    proofUrl: { type: String, trim: true, default: "" },
    proofName: { type: String, trim: true, default: "" },
    proofType: { type: String, enum: ["image", "file"] },
    proofNote: { type: String, trim: true, default: "", maxlength: 1000 },
    template: { type: Schema.Types.ObjectId, ref: "TaskTemplate" },
  },
  { timestamps: true }
);

TaskSchema.index({ assignedTo: 1, date: -1 });
TaskSchema.index({ team: 1, date: -1 });
// Prevents the same recurring template from generating two tasks for the
// same person on the same day, even if "generate" is triggered twice.
TaskSchema.index(
  { template: 1, assignedTo: 1, date: 1 },
  { unique: true, partialFilterExpression: { template: { $exists: true } } }
);

export default (models.Task as mongoose.Model<ITask>) || model<ITask>("Task", TaskSchema);
