import { Schema, model, models } from "mongoose";

const MatchSchema = new Schema({
  reunion: { type: Schema.Types.ObjectId, ref: "Reunion", required: true },
  groupA: { type: Schema.Types.ObjectId, ref: "Group", required: true },
  groupB: { type: Schema.Types.ObjectId, ref: "Group", required: true },
  status: { type: String, enum: ["playing", "finished"], default: "playing" },
  winner: { type: Schema.Types.ObjectId, ref: "Group" },
  createdAt: { type: Date, default: Date.now },
  endedAt: { type: Date },
});

const Match = models.Match || model("Match", MatchSchema);

export default Match;
