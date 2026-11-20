| Метод  | Адреса               | Що робить                                                    |
| ------ | -------------------- | ------------------------------------------------------------ |
| `GET`  | `/version`           | Повертає SHA поточного Git-коміту                            |
| `POST` | `/grades`            | Викладач виставляє оцінку студенту                           |
| `GET`  | `/grades`            | Студент отримує список своїх оцінок                          |
| `GET`  | `/grades/average`    | Студент отримує свій середній бал                            |
| `GET`  | `/lessons/:lessonId` | Викладач відкриває заняття та отримує список студентів групи |

## POST /grades

Запит:

```http
POST /grades
X-User-Id: 00000000-0000-0000-0000-000000000001
Content-Type: application/json

{
    "student_id": "00000000-0000-0000-0000-000000000003",
    "lesson_id": "00000000-0000-0000-0000-000000000030",
    "score": 95
}
```

Відповідь `201 Created`:

```json
{
    "id": "uuid",
    "student_id": "uuid",
    "lesson_id": "uuid",
    "score": 95,
    "created_at": "2026-10-12T18:00:00.000Z"
}
```

Приклад помилки `409 Conflict`:

```json
{ "error": "Grade for this student and lesson already exists" }
```

## GET /lessons/:lessonId

Запит:

```http
GET /lessons/00000000-0000-0000-0000-000000000030
X-User-Id: 00000000-0000-0000-0000-000000000001
```

Відповідь `200 OK`:

```json
{
    "lesson_id": "uuid",
    "date": "2026-10-12T10:00:00.000Z",
    "subject_name": "Програмування",
    "students": [{ "student_id": "uuid", "student_name": "Іван Петренко" }]
}
```

## GET /grades

Фільтри `subject_id` і `lesson_id` необов'язкові, їх можна комбінувати.

Запит:

```http
GET /grades?subject_id=00000000-0000-0000-0000-000000000020
X-User-Id: 00000000-0000-0000-0000-000000000002
```

Відповідь `200 OK`:

```json
[
    {
        "grade_id": "uuid",
        "score": 90,
        "created_at": "2026-10-12T18:00:00.000Z",
        "lesson_date": "2026-10-12T10:00:00.000Z",
        "subject_name": "Програмування"
    }
]
```

## GET /grades/average

Запит:

```http
GET /grades/average
X-User-Id: 00000000-0000-0000-0000-000000000002
```

Відповідь `200 OK`:

```json
{ "average_score": 88.5 }
```

Якщо оцінок немає:

```json
{ "average_score": null }
```
