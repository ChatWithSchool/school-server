# school-server

השרת של מערכת הניהול הפדגוגית. Node.js, TypeScript, Express ו-Mongoose מול MongoDB. אימות עם JWT והרשאות לפי מטריצת הרשאות.

## התחלה מהירה

### 1. מסד נתונים (פעם אחת)

השרת צריך MongoDB שרץ על המחשב שלך. הדרך המומלצת:

1. מורידות את **MongoDB Community Server**, גרסה **7.0** (כמו ב-CI), ל-Windows: https://www.mongodb.com/try/download/community
2. מתקינות עם ברירות המחדל, ומשאירות מסומן **Install MongoD as a Service**. כך המסד עולה לבד עם המחשב. את Compass לא חייבים להתקין.

זהו. הכתובת `mongodb://localhost:27017` שב-`.env.example` כבר מצביעה עליו.

**חלופות:**

- **Docker:** מי שמותקן אצלה Docker יכולה להריץ `docker compose up -d` במקום ההתקנה.
- **MongoDB Atlas:** מסד חינמי בענן, למי שלא יכולה להתקין. יוצרות cluster ומדביקות את הכתובת שלו ב-`MONGODB_URI` שב-`.env`.

### 2. להריץ את השרת

```bash
npm install
cp .env.example .env            # אפשר להשאיר את ברירות המחדל לפיתוח מקומי
npm run seed                    # נתוני הדגמה: מוסד, צוות, כיתות, תלמידים, מערכת שעות, ציונים ונוכחות
npm run dev                     # השרת על http://localhost:4000
```

משתמש הדגמה: `yuval.mizrahi@school.example` עם הסיסמה `Demo1234!` (הנהלה). משתמשים נוספים מופיעים בהדפסה של `npm run seed`.

בדיקת תקינות: `curl http://localhost:4000/api/health`

### 3. לראות את הנתונים ב-VS Code

1. מתקינות את התוסף **MongoDB for VS Code** (`Ctrl+Shift+X`, ומחפשות MongoDB).
2. בסרגל השמאלי לוחצות על העלה הירוק, ואז **Add Connection** > **Connect with Connection String**, ומדביקות `mongodb://localhost:27017`.
3. בחלונית **CONNECTIONS** פותחות את `localhost:27017` > `school` > אוסף, למשל `lessons`.
4. **Documents** מציג את הרשומות, **Schema** מראה אילו שדות יש בהן, ו-**Indexes** מציג את האינדקסים.

הסכמה עצמה כתובה בקוד, ב-`src/models` ובמודל של המודול שלך. מה שרואים בתוסף הוא הנתונים שנשמרו לפיה.

### תקלות נפוצות

- **הרצתי seed ולא רואה נתונים:** כנראה רצים אצלך שני שרתי MongoDB על אותו פורט (גם התקנה של Windows וגם Docker). השרת מתחבר לאחד מהם, ואת מסתכלת על השני. בחרי אחד: עצרי את Docker (`docker compose down`), או עצרי את השירות `MongoDB` ב-Windows (Services > MongoDB > Stop).
- **`ECONNREFUSED 127.0.0.1:27017`:** המסד לא רץ. ב-Windows: Services > MongoDB > Start. עם Docker: `docker compose up -d`.

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
  seed/                      seed הליבה (core.ts) ו-seed האוספים המשותפים (shared/)
  modules/<שם>/              כל מסך או משאב במודול משלו
      model.ts schema.ts routes.ts seed.ts *.test.ts
openapi/openapi.yaml         חוזה ה-API
```

**כל מפתחת עובדת בתיקיית מודול משלה.** ה-`routes.ts` של כל מודול מחובר לשרת אוטומטית, וה-`seed.ts` שלו רץ אוטומטית ב-`npm run seed`. אין קובץ משותף שכולן עורכות, ולכן אין התנגשויות מיזוג.

## האוספים המשותפים

אוסף שיותר ממסך אחד קורא ממנו נמצא ב-`src/models`, יחד עם אוספי הליבה. המודל וה-seed שלו כבר מוכנים, ולכן אף מסך לא מחכה למסך אחר. המסך שבעמודה "כותב" אחראי על ה-endpoints שכותבים לאוסף (סרבר ב'). שאר המסכים רק קוראים ממנו.

| אוסף                 | מודל                 | כותב | קוראים                            |
| -------------------- | -------------------- | ---- | --------------------------------- |
| rooms                | `Room`               | I08  | T02                               |
| events               | `SchoolEvent`        | I07  | T01                               |
| teaching_assignments | `TeachingAssignment` | I06  | I05, G08                          |
| lessons              | `Lesson`             | T02  | T01, T03, T04, T06, N01           |
| invites              | `Invite`             | A07  | X03                               |
| assessments          | `Assessment`         | G04  | G01, G02, G05                     |
| grades               | `Grade`              | G01  | S03, S08, G02, G05, G07, X03      |
| grade_feedback       | `GradeFeedback`      | G01  | G02                               |
| attendance_records   | `AttendanceRecord`   | N01  | S03, S08, N03, N04, N05, N06, X03 |
| attendance_alerts    | `AttendanceAlert`    | N04  | X03                               |

- **תאריך בלי שעה** (יום נוכחות, תאריך אירוע) נשמר כמחרוזת `YYYY-MM-DD`. ראי `src/utils/dateOnly.ts`.
- **תגיות של תלמיד** הן השדה `tags` של `Student`, ואין להן אוסף נפרד.
- **סדר ה-seed:** הליבה, אחריה האוספים המשותפים (`seed/shared`), ורק אז ה-seed של המודולים. ה-seed שלך יכול לקרוא מכל אלה.
- **נוכחות והתראות מתחלפות בכל הרצה:** ה-seed בונה מחדש 20 ימי לימודים עד היום, ולכן הוא מוחק את הנוכחות ואת ההתראות של מוסד הדוגמה. נוכחות שסימנת במסד המקומי נמחקת כשמריצים `npm run seed` שוב.

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
