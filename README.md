# Електронний журнал

«Електронний журнал» — навчальний бекенд-застосунок для обліку оцінок студентів. Система дозволяє викладачам виставляти оцінки за заняття з власних предметів, а студентам — переглядати свої оцінки та середній бал.

---

## Стек технологій

- Node.js, Fastify, TypeScript
- PostgreSQL (драйвер `pg`)
- Traefik - reverse proxy, маршрутизація за hostname
- Vitest — тести та покриття
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
make check                  # усе разом: npm ci, форматування, лінтер, збірка, npm run test:all
```

### Тести

```bash
npm test                    # unit + smoke, без Docker
npm run test:integration    # інтеграційні з реальним PostgreSQL
npm run test:e2e            # сценарій через HTTP до контейнера застосунку
npm run test:all            # unit + integration з покриттям, потім e2e (або make test)
npm run test:mutation       # Stryker для grades.service.ts, поріг 80 % (або make mutation)
npm run typecheck:tests     # перевірка типів у тестах
```

`test:integration`, `test:e2e` і `test:all` потребують Docker: [`scripts/run-tests.mjs`](./scripts/run-tests.mjs) піднімає оточення з [`docker-compose.test.yml`](./docker-compose.test.yml), запускає тести й завжди його прибирає. Звіт мутацій — [docs/mutation-report.md](./docs/mutation-report.md).

## Структура репозиторію

```text
node3/
├── .husky/                     # Git-хуки (pre-commit, pre-push)
├── ai/                         # Матеріали та історія роботи з ШІ
│   ├── lab1/
│   │   └── prompts.md          # Логи та промпти взаємодії з ШІ
│   ├── lab2/
│   │   └── prompts.md
│   └── lab3/
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
│   │   ├── 0005-use-raw-sql-over-orm.md
│   │   ├── 0006-use-vitest-over-jest.md
│   │   └── 0007-use-docker-compose-for-test-environment.md
│   ├── diagrams/               # Архітектурні діаграми
│   │   └── er/
│   │       └── ER_Nodejs3.drawio.png
│   ├── api.md                  # Документація API ендпоінтів
│   └── mutation-report.md      # Звіт мутаційного тестування з класифікацією вижилих мутантів
├── scripts/
│   └── run-tests.mjs           # Тестове оточення в Docker: БД, міграція, тести, застосунок для E2E, прибирання
├── src/                        # Вихідний код бекенду (TypeScript)
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
│   │   ├── grades.schema.ts
│   │   └── uuid.schema.ts      # Канонічний шаблон UUID для id у тілі, path і query
│   ├── services/               # Бізнес-логіка та оркестрація
│   │   ├── grades.service.ts
│   │   ├── lessons.service.ts
│   │   ├── subjects.service.ts
│   │   └── users.service.ts
│   ├── types/
│   │   └── domain.ts           # Доменні типи та інтерфейси TypeScript
│   ├── app.ts                  # Ініціалізація та конфігурація Fastify
│   └── server.ts               # Точка входу (запуск HTTP-сервера)
├── tests/                      # Тести (Vitest), не входять у збірку dist
│   ├── e2e/
│   │   └── grading-flow.test.ts    # Сценарій через HTTP до контейнера застосунку, /version
│   ├── helpers/
│   │   ├── db.ts               # Пул тестової БД, очищення, знімок таблиць, expectDatabaseUnchanged
│   │   └── factory.ts          # Створення тестових даних (групи, користувачі, предмети, заняття, оцінки)
│   ├── integration/
│   │   ├── helpers/
│   │   │   └── app.ts          # Застосунок через app.inject, X-User-Id, спільні випадки 400/401
│   │   ├── http.average.test.ts        # GET /grades/average
│   │   ├── http.create-grade.test.ts   # POST /grades
│   │   ├── http.db-unavailable.test.ts # 503 при недоступній БД
│   │   ├── http.list-grades.test.ts    # GET /grades
│   │   ├── http.open-lesson.test.ts    # GET /lessons/:lessonId
│   │   ├── repositories.test.ts        # Репозиторії з реальним PostgreSQL
│   │   └── setup.ts            # Підключення до БД і очищення перед кожним тестом
│   ├── smoke/
│   │   └── app.smoke.test.ts   # Smoke-тест (GET /version)
│   ├── unit/
│   │   ├── fixtures/
│   │   │   └── grades.fixtures.ts  # Тестові дані для unit-тестів GradeService
│   │   ├── database.test.ts    # Ретраї та 503 у db/database.ts (pg замокано)
│   │   └── grades.service.test.ts  # GradeService із замоканими залежностями
│   └── tsconfig.json           # Перевірка типів тестів (npm run typecheck:tests)
├── standards/                  # Стандарти розробки та чеклисти
│   ├── adr_format.md
│   ├── checks.md
│   ├── definition_of_done.md
│   └── spec_format.md
├── .dockerignore               # Файли, що не потрапляють у Docker-образ
├── .env.example                # Шаблон змінних середовища
├── .gitattributes              # Закінчення рядків LF для всіх текстових файлів
├── .gitignore                  # Ігноровані Git файли
├── .prettierrc                 # Налаштування форматування Prettier
├── audit.md                    # Звіт з архітектурного аудиту
├── docker-compose.proxy.yml    # Спільний Traefik-проксі для всіх гілок (порт 80)
├── docker-compose.test.yml     # Тестове оточення: db на tmpfs і app для E2E, без Traefik
├── docker-compose.yml          # Оточення гілки: db, migrate, app
├── Dockerfile                  # Двоетапна збірка образу застосунку
├── eslint.config.js            # Конфігурація лінтера ESLint
├── Makefile                    # Команди автоматизації (`make check`, `make up`, тощо)
├── package-lock.json           # Фіксація версій пакетів npm
├── package.json                # Залежності та npm-скрипти
├── README.md                   # Головна документація проєкту
├── spec.md                     # Інженерна специфікація проєкту
├── stryker.config.json         # Конфігурація мутаційного тестування (Stryker)
├── tsconfig.json               # Конфігурація компілятора TypeScript
└── vitest.config.ts            # Конфігурація Vitest: проєкти тестів, покриття й пороги
```

## Інші документи

- [spec.md - інженерний опис](./spec.md)
- [docs/api.md - документація API](./docs/api.md)
- [docs/adr - архітектурні рішення](./docs/adr/)
- [docs/mutation-report.md - звіт мутаційного тестування](./docs/mutation-report.md)
- [docs/diagrams - діаграми](./docs/diagrams/)
- [audit.md - звіт з архітектурного аудиту](./audit.md)
- [standards - стандарти розробки](./standards/)
