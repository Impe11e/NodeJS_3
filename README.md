# Електронний журнал

«Електронний журнал» — навчальний бекенд-застосунок для обліку оцінок студентів. Система дозволяє викладачам виставляти оцінки за заняття з власних предметів, а студентам — переглядати свої оцінки та середній бал.

---

## Стек технологій

- Node.js, Fastify, TypeScript
- PostgreSQL (драйвер `pg`)
- Traefik - reverse proxy, маршрутизація за hostname
- Jest — тести
- ESLint — лінтер
- Prettier — форматер
- Husky + lint-staged — git hooks

---

## Архітектура та принципи

Застосунок спроєктовано за принципом **шаруватої архітектури (Layered Architecture / Package-by-Layer)**:

- **Поділ за шарами відповідальності:** Код структуровано за тришаровою схемою `routes` $\rightarrow$ `services` $\rightarrow$ `repositories`.
    - `src/routes/` — обробка HTTP-запитів Fastify, маршрутизація, перевірка заголовків та повернення JSON-відповідей.
    - `src/services/` — централізована бізнес-логіка застосунку та перевірка правил доступу.
    - `src/repositories/` — шар доступу до даних (PostgreSQL).
- **Ізоляція шарів:** Шар `routes` викликає тільки відповідний `service`, а `service` звертається до `repository`. Прямий доступ з контролерів до баз даних заборонений.

## Запуск та перевірка

```bash
git clone https://github.com/Impe11e/NodeJS_3.git
cd NodeJS_3
```

### Варіант 1: Docker

Потрібні Docker і Docker Compose. Локальний PostgreSQL не потрібен.

```bash
make up
```

Команда піднімає спільний Traefik-проксі (порт 80), базу даних, застосовує міграцію й seed і запускає застосунок. Кожна git-гілка отримує власні контейнери, власну БД і власну адресу:

```text
App: http://<гілка>.node3.localhost
DB:  127.0.0.1:<випадковий порт>
```

Наприклад, для гілки `feature-branch` — `http://feature-branch.node3.localhost`. Порт БД обирає Docker, тож кілька гілок і проєктів не конфліктують між собою.

| Команда           | Що робить                                      |
| ----------------- | ---------------------------------------------- |
| `make up`         | Зібрати й запустити оточення поточної гілки    |
| `make down`       | Зупинити оточення гілки (дані БД зберігаються) |
| `make clean`      | Зупинити оточення гілки та видалити її БД      |
| `make logs`       | Логи застосунку                                |
| `make db-port`    | Показати порт БД гілки                         |
| `make url`        | Показати адресу застосунку                     |
| `make proxy-down` | Зупинити Traefik                               |

Панель Traefik зі списком маршрутів: `http://localhost:8080`.

### Варіант 2: локально

Потрібен запущений PostgreSQL.

```bash
npm install
cp .env.example .env        # Windows: copy .env.example .env
```

Задайте параметри в `.env`:

```env
DATABASE_URL=postgres://db_user:db_password@localhost:5432/database_name
PORT=3000
LOG_LEVEL=info
```

Далі:

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

## Перевірка коду та запуск тестів

```bash
make check                  # усе разом: форматування, лінтер, збірка, тести
```

## Структура репозиторію

```text
node3/
├── .husky/                     # Git-хуки (pre-commit, pre-push)
├── ai/                         # Матеріали та історія роботи з ШІ
│   ├── lab1/
│   │   └── prompts.md          # Логи та промпти взаємодії з ШІ
│   └── lab2/
│       └── prompts.md
├── db/                         # База даних: міграції та скрипти
│   ├── migrations/
│   │   └── 001_initial.sql     # Початкова міграція схеми БД
│   ├── clear.sql               # Скрипт очищення таблиць
│   └── seed.sql                # Початкові дані для заповнення (seed)
├── docs/                       # Проєктна документація
│   ├── adr/                    # Архітектурні рішення (Architectural Decision Records)
│   │   ├── 0001-use-layered-architecture.md
│   │   ├── 0002-use-x-user-id-header.md
│   │   ├── 0003-use-postgresql.md
│   │   ├── 0004-use-eslint-prettier-husky.md
│   │   └── 0005-use-raw-sql-over-orm.md
│   ├── diagrams/               # Архітектурні діаграми
│   │   └── er/
│   │       └── ER_Nodejs3.drawio.png
│   └── api.md                  # Документація API ендпоінтів
├── src/                        # Вихідний код бекенду (TypeScript)
│   ├── __tests__/
│   │   └── app.smoke.test.js   # Smoke-тест (GET /version)
│   ├── db/
│   │   ├── database.ts         # Пул PostgreSQL: initDatabase, query, withTransaction, ретраї
│   │   ├── runSqlFile.ts       # Утиліта для виконання SQL-файлів (db:migrate, db:seed)
│   │   └── sql.ts              # Tagged template sql`...` для параметризованих запитів
│   ├── errors/
│   │   └── appError.ts         # Кастомний клас бізнес-помилок з HTTP-статусами
│   ├── logger/
│   │   └── requestContext.ts   # AsyncLocalStorage: getLogger() з reqId поточного запиту
│   ├── middleware/
│   │   ├── authenticateUserHook.ts # Хук перевірки заголовоку X-User-Id
│   │   └── globalErrorHandler.ts   # Глобальний обробник помилок
│   ├── repositories/           # Шар доступу до даних (SQL-запити)
│   │   ├── grades.repository.ts
│   │   ├── lessons.repository.ts
│   │   ├── subjects.repository.ts
│   │   └── users.repository.ts
│   ├── routes/                 # HTTP-маршрути Fastify
│   │   ├── grades.routes.ts
│   │   └── lessons.routes.ts
│   ├── schemas/                # Схеми валідації вхідних даних (Fastify schemas)
│   │   └── grades.schema.ts
│   ├── services/               # Бізнес-логіка та оркестрація
│   │   ├── grades.service.ts
│   │   ├── lessons.service.ts
│   │   ├── subjects.service.ts
│   │   └── users.service.ts
│   ├── types/
│   │   └── domain.ts           # Доменні типи та інтерфейси TypeScript
│   ├── app.ts                  # Ініціалізація та конфігурація Fastify
│   └── server.ts               # Точка входу (запуск HTTP-сервера)
├── standards/                  # Стандарти розробки та чеклисти
│   ├── adr_format.md
│   ├── checks.md
│   ├── definition_of_done.md
│   └── spec_format.md
├── .dockerignore               # Файли, що не потрапляють у Docker-образ
├── .env.example                # Шаблон змінних середовища
├── .gitignore                  # Ігноровані Git файли
├── .prettierrc                 # Налаштування форматування Prettier
├── audit.md                    # Звіт з архітектурного аудиту
├── docker-compose.proxy.yml    # Спільний Traefik-проксі для всіх гілок (порт 80)
├── docker-compose.yml          # Оточення гілки: db, migrate, app
├── Dockerfile                  # Двоетапна збірка образу застосунку
├── eslint.config.js            # Конфігурація лінтера ESLint
├── Makefile                    # Команди автоматизації (`make check`, `make up`, тощо)
├── package-lock.json           # Фіксація версій пакетів npm
├── package.json                # Залежності та npm-скрипти
├── README.md                   # Головна документація проєкту
├── spec.md                     # Інженерна специфікація проєкту
└── tsconfig.json               # Конфігурація компілятора TypeScript
```

## Інші документи

- [spec.md - інженерний опис](./spec.md)
- [docs/api.md - документація API](./docs/api.md)
- [docs/adr - архітектурні рішення](./docs/adr/)
- [docs/diagrams - діаграми](./docs/diagrams/)
- [audit.md - звіт з архітектурного аудиту](./audit.md)
- [standards - стандарти розробки](./standards/)
