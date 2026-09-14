import mongoose, { Schema, models, model, Document, Types } from "mongoose";

export interface ITeam extends Document {
  name: string;
  department: string;
  head: Types.ObjectId;
  members: Types.ObjectId[];
  createdAt: Date;
}

const TeamSchema = new Schema<ITeam>(
  {
    name: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    head: { type: Schema.Types.ObjectId, ref: "User", required: true },
    members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

export default (models.Team as mongoose.Model<ITeam>) || model<ITeam>("Team", TeamSchema);
