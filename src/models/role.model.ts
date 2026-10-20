import { Schema, model, type InferSchemaType } from 'mongoose';
import { ROLE_KEYS } from '../permissions';

/** Roles of an institution. The built-in roles are seeded; custom roles are a later version. */
const roleSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    key: { type: String, required: true },
    name: { type: String, required: true },
    builtIn: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'roles' },
);
roleSchema.index({ institutionId: 1, key: 1 }, { unique: true });

/** Per-institution overrides of the permission matrix (screen x role x level). */
const rolePermissionSchema = new Schema(
  {
    institutionId: { type: Schema.Types.ObjectId, ref: 'Institution', required: true, index: true },
    roleKey: { type: String, enum: ROLE_KEYS, required: true },
    screenId: { type: String, required: true },
    level: { type: String, enum: ['full', 'scoped', 'read'], required: true },
  },
  { timestamps: true, collection: 'role_permissions' },
);
rolePermissionSchema.index({ institutionId: 1, roleKey: 1, screenId: 1 }, { unique: true });

export type RoleDoc = InferSchemaType<typeof roleSchema>;
export const Role = model('Role', roleSchema);
export const RolePermission = model('RolePermission', rolePermissionSchema);
