import { Router } from 'express';
import { Types } from 'mongoose';
import { authorize } from '../../middleware/authorize';
import { AppError } from '../../utils/AppError';
import { asyncHandler } from '../../utils/asyncHandler';
import { Term } from './model';

const router = Router();

const toDateOnly = (d: Date): string => d.toISOString().slice(0, 10);

// GET /api/terms?yearId=...  (I03 · מחזורי הערכה)
// התשובה זהה לסכמה TermList בחוזה: { items: Term[] }
router.get(
    '/terms',
    authorize('I03', 'read'),
    asyncHandler(async (req, res) => {
        const { yearId } = req.query;
        const filter: Record<string, unknown> = { institutionId: req.user!.institutionId };

        if (yearId !== undefined) {
            if (typeof yearId !== 'string' || !Types.ObjectId.isValid(yearId)) {
                throw new AppError(400, 'BAD_ID', 'מזהה שנת לימודים לא תקין');
            }
            filter.academicYearId = yearId;
        }

        const terms = await Term.find(filter).sort({ startDate: 1 }).lean();
        res.json({
            items: terms.map((t) => ({
                id: String(t._id),
                name: t.name,
                startDate: toDateOnly(t.startDate),
                endDate: toDateOnly(t.endDate),
                // בחוזה רק open/closed; planned ו-active מוצגים כ-open
                status: t.status === 'closed' ? 'closed' : 'open',
            })),
        });
    }),
);

export default router;