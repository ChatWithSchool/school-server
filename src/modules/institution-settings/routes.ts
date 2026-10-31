import { Router } from 'express';
import { Types } from 'mongoose';
import { authorize } from '../../middleware/authorize';
import { Institution } from '../../models';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';

const router = Router();

// GET /api/institutions/:id  (I03 · פרטי המוסד והגדרות)
// התשובה זהה לסכמה Institution בחוזה (openapi.yaml)
router.get(
    '/institutions/:id',
    authorize('I03', 'read'),
    asyncHandler(async (req, res) => {
        const { id } = req.params;
        if (!Types.ObjectId.isValid(id)) throw new AppError(400, 'BAD_ID', 'מזהה לא תקין');
        // משתמש רואה רק את המוסד שלו
        if (id !== req.user!.institutionId) throw new AppError(404, 'NOT_FOUND', 'המוסד לא נמצא');

        const inst = await Institution.findById(id).lean();
        if (!inst) throw new AppError(404, 'NOT_FOUND', 'המוסד לא נמצא');

        res.json({
            id: String(inst._id),
            name: inst.name,
            type: inst.type,
            address: inst.address,
            phone: inst.phone,
            contactEmail: inst.contactEmail,
            activeYearId: inst.activeYearId ? String(inst.activeYearId) : undefined,
        });
    }),
);

export default router;