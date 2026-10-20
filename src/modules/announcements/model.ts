import { Schema, model, type InferSchemaType } from 'mongoose';

const announcementSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    audience: { type: String, enum: ['all', 'staff'], default: 'staff' },
    pinned: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true, collection: 'announcements' },
);
announcementSchema.index({ institutionId: 1, pinned: -1, createdAt: -1 });

export type AnnouncementDoc = InferSchemaType<typeof announcementSchema>;
export const Announcement = model('Announcement', announcementSchema);
