import { Schema, model, type InferSchemaType } from 'mongoose';

const roomSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, enum: ['classroom', 'lab', 'hall'], default: 'classroom' },
    capacity: { type: Number, min: 0 },
    notes: { type: String, trim: true },
    /** A room with lessons is disabled, not deleted. */
    active: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'rooms' },
);
roomSchema.index({ institutionId: 1, name: 1 }, { unique: true });

export type RoomDoc = InferSchemaType<typeof roomSchema>;
export const Room = model('Room', roomSchema);
