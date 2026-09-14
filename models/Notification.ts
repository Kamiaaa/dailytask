import mongoose, { Schema, models, model, Document, Types } from "mongoose";

export type NotificationType =
  | "task_assigned"
  | "task_submitted"
  | "task_approved"
  | "task_rejected";

export interface INotification extends Document {
  user: Types.ObjectId; // recipient
  type: NotificationType;
  message: string;
  task?: Types.ObjectId;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["task_assigned", "task_submitted", "task_approved", "task_rejected"],
      required: true,
    },
    message: { type: String, required: true },
    task: { type: Schema.Types.ObjectId, ref: "Task" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export default (models.Notification as mongoose.Model<INotification>) ||
  model<INotification>("Notification", NotificationSchema);
