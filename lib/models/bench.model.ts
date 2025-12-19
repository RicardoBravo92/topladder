import { Schema, model, models } from "mongoose";

const BenchSchema = new Schema({
  reunion: { type: Schema.Types.ObjectId, ref: "Reunion", required: true, unique: true },
  players: [{ type: Schema.Types.ObjectId, ref: "User" }],
});

const Bench = models.Bench || model("Bench", BenchSchema);

export default Bench;
