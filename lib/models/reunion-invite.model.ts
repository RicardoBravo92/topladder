import { Schema, model, models } from "mongoose";

const ReunionInviteSchema = new Schema({
  reunion: { type: Schema.Types.ObjectId, ref: "Reunion", required: true },
  inviter: { type: Schema.Types.ObjectId, ref: "User", required: true },
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: { 
    type: String, 
    enum: ["pending", "accepted", "rejected"], 
    default: "pending" 
  },
  createdAt: { type: Date, default: Date.now },
});

// One invite per reunion/recipient
ReunionInviteSchema.index({ reunion: 1, recipient: 1 }, { unique: true });

const ReunionInvite = models.ReunionInvite || model("ReunionInvite", ReunionInviteSchema);

export default ReunionInvite;
