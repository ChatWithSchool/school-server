# מודול חדש ב-30 דקות

> מתחילות את ספרינט 2? קראי קודם את [sprint-2-schemas.md](sprint-2-schemas.md): איך יודעים אילו אוספים לבנות, והכללים.

1. פתחי ענף מ-`dev`: `feature/PEDB-12-I08-schema`.
2. צרי את המודול: `npm run new:module -- room --screen I08` (שם בלשון יחיד באנגלית ומזהה המסך).
3. ערכי `src/modules/rooms/model.ts`: השדות של המשאב. השתמשי בעמוד המסך באפיון ובחוזה ב-`openapi/openapi.yaml`.
   - אוסף שמופיע ב-`src/models` (אוספי הליבה והאוספים המשותפים) כבר קיים. לא כותבים אותו שוב: מייבאים אותו מ-`../../models` ומוחקים את `model.ts` שנוצר.
   - אסור לייבא מתיקייה של מודול אחר. ESLint יחסום את זה.
4. ערכי `schema.ts`: ולידציות zod עם הודעות בעברית.
5. ערכי `routes.ts`: השאירי את `authorize('I08', ...)` והתאימי את ה-endpoints לחוזה.
6. ערכי `seed.ts`: נתוני הדגמה אידמפוטנטיים שמציגים את המסך עם כמה שורות.
7. הריצי `npm run seed` ו-`npm run dev`, ובדקי עם `curl` או עם הקליינט.
8. כתבי בדיקה לכל endpoint, והריצי `npm run verify`.
9. פתחי PR ל-`dev`.

## איך בודקים endpoint ידנית

```bash
# התחברות
TOKEN=$(curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"yuval.mizrahi@school.example","password":"Demo1234!"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).token")

# קריאה
curl -s http://localhost:4000/api/announcements -H "Authorization: Bearer $TOKEN"
```
