import { Schema, model, models } from "mongoose";

const QueueSchema = new Schema({
  reunion: { type: Schema.Types.ObjectId, ref: "Reunion", required: true, unique: true },
  groups: [{ type: Schema.Types.ObjectId, ref: "Group" }],
});

const Queue = models.Queue || model("Queue", QueueSchema);

export default Queue;
