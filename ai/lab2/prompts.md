# AI Prompt History: Електронний журнал

> **Date Exported:** 2026-10-13 17:30:25  
> **Source Session:** `a7b42e85cc7d9`  
> **Link:** [https://share.gemini.google/DyALsNjPqonE](https://share.gemini.google/DyALsNjPqonE)

---

## Prompt Log

### Prompt 20

```text
ось оновлений spec.md (з урахуванням зауважень з аудиту):

Тепер онови spec.md: 1. додай до кожного сценарію пункт "очікувана відповідь" (код + формат відповіді); 2. туди ж додавай приклад запиту в бд; 3. туди ж додай в помилки помилку "503 - БД не відповідає".
```

---

### Prompt 21

```text
по фото розпиши схему бд. структура таблиць така: | Column       | Type        | Keys / Constraints                | Description                     |
```

---

### Prompt 22

```text
в маркдаун форматі
```

---

### Prompt 23

```text
згенеруй базовий тсконфіг зі строгою типізацією, тип ESmodules
```

---

### Prompt 25

```text
напиши в такому ж стилі у форматі маркдаун адр про використання сирого скл замість ОРМ
```

---

### Prompt 26

```text
Реалізуй перший етап застосунку на !!статичних in-memory даних!! без бд:

Створи або онови:
src/types/domain.ts (описати основні типи Role, Group, User і тд)
src/repositories/inMemoryStore.ts
src/repositories для кожної сутності

У src/repositories/inMemoryStore.ts додай мокапи:
масиви groups, users, subjects, teacherSubjects, lessons, grades.
Seed-дані: щонайменше 1 викладач, щонайменше 2 студенти, щонайменше 2 групи, щонайменше 2 предмети, щонайменше 2 заняття, зв’язок викладача лише з одним предметом, студентів із різних груп

Потрібні методи: пошук користувача за id, пошук студентів групи, пошук предмета, перевірка зв’язку викладача з предметом, пошук заняття, пошук занять предмета, пошук оцінок студента, пошук оцінки за парою student + lesson, створення оцінки

Використовуй строгі TypeScript-типи, не використовуй any

ВАЖЛИВО:
README.md не змінювати
PostgreSQL і pg не використовувати
SQL не писати
Repositories повинні містити тільки доступ до даних, без бізнес-логіки та HTTP-коду
```

---

### Prompt 27

```text
Реалізуй бізнес-логіку та спільну обробку запитів згідно зі spec.md:
Створи або онови:
src/services/...

Реалізуй обробник помилок та хук ідентифікації:
src/errors/appError.ts
src/middleware/authenticateUserHook.ts
src/middleware/globalErrorHandler.ts

AppError
Додай: badrequest, unauthorized, forbidden, notfound, conflict.
!! AppError повинен зберігати HTTP statusCode і message

2. authenticateUserHook
Реалізуй Fastify preHandler hook, який: читає заголовок X-User-Id; повертає 401, якщо заголовок відсутній; знаходить користувача через UserService; повертає 401, якщо користувач невідомий.
!! Hook перевіряє лише ідентифікацію. Бізнес-права повинні перевірятися у services

3. globalErrorHandler
Реалізуй глобальний Fastify error handler, який: AppError перетворює на відповідний HTTP-код; validation errors перетворює на 400; невідомі помилки логуються через request.log.error; невідомі помилки повертають 500; не приховує помилки

4. Services
Реалізуй правила: лише TEACHER може виставляти оцінки, score - ціле число від 1 до 100, заняття повинно існувати, викладач повинен вести предмет заняття, студент повинен існувати, користувач повинен мати роль STUDENT, студент повинен належати до групи заняття, повторна оцінка для student + lesson повертає 409, студент бачить тільки власні оцінки, оцінки можна фільтрувати за subject_id і lesson_id; середній бал повертається як число; якщо оцінок немає - повертається null, викладач може відкрити лише заняття свого предмета, при відкритті заняття повертається список студентів відповідної групи

Правила такі самі лишаються
```

---

### Prompt 28

```text
Реалізація не відповідає моїй структурі. виправ:

Використовуй існуючі файли:
   - usersServices.ts (у множині)
2. Не створюй класи UserService, SubjectService, LessonService, GradeService
3. У проєкті UUID мають тип string а не number
4. Hook має використовувати поточний UserService і записувати користувача в request.user.
5. Середній бал повинен повертатися як:
   { "average_score": number | null }
6. Оцінки повинні відповідати формату GradeView: grade_id, score, created_at, lesson_date, subject_name
```

---
