import { Schema, model, models } from "mongoose";

const GroupSchema = new Schema({
  name: { type: String, required: true },
  reunion: { type: Schema.Types.ObjectId, ref: "Reunion", required: true },
  members: [{ type: Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

GroupSchema.index({ reunion: 1, members: 1 });

const Group = models.Group || model("Group", GroupSchema);

export default Group;
