import { Schema, model, models } from "mongoose";

const FriendSchema = new Schema({
  requester: { type: Schema.Types.ObjectId, ref: "User", required: true },
  recipient: { type: Schema.Types.ObjectId, ref: "User", required: true },
  status: { 
    type: String, 
    enum: ["pending", "accepted", "rejected"], 
    default: "pending" 
  },
  createdAt: { type: Date, default: Date.now },
});

// Avoid duplicate requests
FriendSchema.index({ requester: 1, recipient: 1 }, { unique: true });

const Friend = models.Friend || model("Friend", FriendSchema);

export default Friend;
