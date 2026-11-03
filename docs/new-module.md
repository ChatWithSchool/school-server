# מודול חדש ב-30 דקות

1. פתחי ענף מ-`dev`: `feature/PEDB-12-I08-schema`.
2. צרי את המודול: `npm run new:module -- room --screen I08` (שם בלשון יחיד באנגלית ומזהה המסך).
3. ערכי `src/modules/rooms/model.ts`: השדות של המשאב. השתמשי בעמוד המסך באפיון ובחוזה ב-`openapi/openapi.yaml`.
   - אוסף שמופיע ב-`src/models` (אוספי הליבה והאוספים המשותפים) כבר קיים. לא כותבים אותו שוב: מייבאים אותו מ-`../../models` ומוחקים את `model.ts` שנוצר.
   - אסור לייבא מתיקייה של מודול אחר. ESLint יחסום את זה.
4. ערכי `schema.ts`: ולידציות zod עם הודעות בעברית.
5. ערכי `routes.ts`: השאירי את `authorize('I08', ...)` והתאימי את ה-endpoints לחוזה.
6. ערכי `seed.ts`: נתוני הדגמה אידמפוטנטיים שמציגים את המסך עם כמה שורות.
7. הריצי `npm run seed` ו-`npm run dev`, ובדקי ב-Postman (בסעיף הבא) או עם הקליינט.
8. כתבי בדיקה לכל endpoint, והריצי `npm run verify`.
9. פתחי PR ל-`dev`.

## איך בודקים endpoint ידנית

בודקות ב-**Postman**: שולחים בקשה לסרבר ורואים את התשובה, בלי מסך. כותבות את הבקשות בעצמן, לפי החוזה.

**התקנה, פעם אחת:** מתקינות ב-VS Code את התוסף **Postman** (`Ctrl+Shift+X`, התוסף של Postman עם סימן המאומת). בסרגל השמאלי לוחצות על סמל Postman ואז **Sign In**, ונרשמות בדפדפן לחשבון חינמי.

**בכל בדיקה:**

1. `npm run dev` בטרמינל.
2. **התחברות:** New HTTP Request, ‏`POST` ‏`http://localhost:4000/api/auth/login`. ב-**Body** בוחרות raw ואז JSON:

   ```json
   {
     "email": "yuval.mizrahi@school.example",
     "password": "Demo1234!"
   }
   ```

   Send, ומעתיקות מהתשובה את `token`.
3. **הבקשה שלך:** New HTTP Request עם ה-method והנתיב מהחוזה, למשל `GET http://localhost:4000/api/announcements?page=1&size=10`. ב-**Authorization** בוחרות Bearer Token ומדביקות את הטוקן. Send.
4. בודקות את הסטטוס, ושהמבנה זהה לחוזה (`items`, `total`, `page`, `size`).
5. שומרות כל בקשה (`Ctrl+S`) ב-collection בשם המסך שלך, כדי לא לכתוב אותה שוב.

הטוקן תקף לזמן מוגבל: כשמקבלות `401`, מתחברות שוב ומדביקות את הטוקן החדש.

כדאי לבדוק גם שגיאות: בלי טוקן (ב-Authorization בוחרות No Auth) מקבלים `401`, ובמשתמש בלי הרשאה למסך מקבלים `403`.
