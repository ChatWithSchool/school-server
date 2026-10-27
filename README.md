# school-server

השרת של מערכת הניהול הפדגוגית. Node.js, TypeScript, Express ו-Mongoose מול MongoDB. אימות עם JWT והרשאות לפי מטריצת הרשאות.

## התחלה מהירה

```bash
npm install
cp .env.example .env            # אפשר להשאיר את ברירות המחדל לפיתוח מקומי
docker compose up -d            # MongoDB מקומי (או חיבור ל-MongoDB אחר ב-.env)
npm run seed                    # נתוני הדגמה: מוסד, צוות, כיתות ותלמידים
npm run dev                     # השרת על http://localhost:4000
```

משתמש הדגמה: `yuval.mizrahi@school.example` עם הסיסמה `Demo1234!` (הנהלה). משתמשים נוספים מופיעים בהדפסה של `npm run seed`.

בדיקת תקינות: `curl http://localhost:4000/api/health`

## פקודות

| פקודה                                     | מה היא עושה                                                         |
| ----------------------------------------- | ------------------------------------------------------------------- |
| `npm run dev`                             | שרת פיתוח עם טעינה מחדש                                             |
| `npm run verify`                          | typecheck, lint ובדיקות. להריץ לפני כל PR                           |
| `npm test`                                | בדיקות. בדיקות שזקוקות למסד נתונים רצות כש-`MONGODB_URI_TEST` מוגדר |
| `npm run seed`                            | ממלא נתוני הדגמה (ניתן להריץ שוב בלי כפילויות)                      |
| `npm run new:module -- room --screen I08` | יוצר מודול חדש עם מודל, סכמה, routes, seed ובדיקות                  |
| `npm run build`                           | קומפילציה ל-`dist`                                                  |

## איך השרת בנוי

```
src/
  app.ts, server.ts          הרכבת האפליקציה והפעלה
  config/                    משתני סביבה עם ולידציה
  models/                    אוספי הליבה והאוספים המשותפים (בבעלות ראשי הצוותות)
  permissions/               מטריצת ההרשאות (matrix.json) והפונקציות שלה
  middleware/                אימות, הרשאה, ולידציה וטיפול בשגיאות
  routes/                    התחברות, וטעינה אוטומטית של המודולים
  seed/                      seed הליבה
  modules/<שם>/              כל מסך או משאב במודול משלו
      model.ts schema.ts routes.ts seed.ts *.test.ts
openapi/openapi.yaml         חוזה ה-API
```

**כל מפתחת עובדת בתיקיית מודול משלה.** ה-`routes.ts` של כל מודול מחובר לשרת אוטומטית, וה-`seed.ts` שלו רץ אוטומטית ב-`npm run seed`. אין קובץ משותף שכולן עורכות, ולכן אין התנגשויות מיזוג.

## מודול ההדרכה

`src/modules/announcements` הוא דוגמה מלאה (הודעות הנהלה, מסך שנדחה מגרסה 1): הרשאות, ולידציה, עימוד, פורמט שגיאות אחיד, seed ובדיקות. קראי אותו לפני שאת כותבת את המודול הראשון שלך.

## כללים

- הרשאות: כל route מתחיל ב-`authorize('<מזהה מסך>', 'read' | 'write')`. כשהרמה היא `scoped`, מסננים לפי הכיתות של המשתמשת (`services/scope.ts`).
- בידוד בין מוסדות: כל שאילתה מסוננת לפי `institutionId` מתוך `req.user`.
- שגיאות: זורקים `AppError` או נותנים ל-zod לזרוק. הפורמט תמיד `{ error: { code, message, details? } }`.
- ולידציה: סכמת zod לכל גוף בקשה, עם הודעות בעברית.
- סכמות ו-seed: אוספי הליבה לא משנים בלי אישור ראשת הצוות. ה-seed שלך חייב להיות אידמפוטנטי.
- גבולות בין מודולים: מודול מייבא רק מהליבה (`models`, `utils`, `middleware` וכו') ומהתיקייה שלו. אוסף שיותר ממודול אחד צריך נמצא ב-`src/models`. ESLint חוסם ייבוא מתיקייה של מודול אחר.
- חוזה: ה-endpoints חייבים להתאים ל-`openapi/openapi.yaml`. שינוי בחוזה מתבצע בפגישת ראשי הצוותות.

## מסמכים נוספים

- [CONTRIBUTING.md](CONTRIBUTING.md): מחזור העבודה השבועי, ענפים, PR וקוד ריוויו
- [docs/new-module.md](docs/new-module.md): איך כותבים מודול ב-30 דקות
- [docs/deploy-aws.md](docs/deploy-aws.md): הצעה לפריסה ב-AWS (EC2 ו-S3)
