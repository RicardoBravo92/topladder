import { Schema, model, models } from 'mongoose';

const ReunionSchema = new Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  admin: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  gameMode: {
    type: String,
    enum: ['individual', 'group'],
    default: 'individual',
    required: true,
  },
  groupSize: { type: Number, default: 2 },
  playersAtOnce: { type: Number, default: 1 },
  playersContinue: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
});

const Reunion = models.Reunion || model('Reunion', ReunionSchema);

export default Reunion;
