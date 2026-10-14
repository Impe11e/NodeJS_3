# Електронний журнал

«Електронний журнал» — навчальний бекенд-застосунок для обліку оцінок студентів. Система дозволяє викладачам виставляти оцінки за заняття з власних предметів, а студентам — переглядати свої оцінки та середній бал.

---

## Стек технологій

- Node.js, Fastify
- PostgreSQL
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

В терміналі:

```bash
git clone https://github.com/Impe11e/NodeJS_3.git
cd NodeJS_3
npm install
copy .env.example .env
```

Задайте `DATABASE_URL` в `.env`:

```env
DATABASE_URL=postgres://db_user:db_password@localhost:5432/database_name
PORT=3000
```

Далі в терміналі:

```bash
npm run db:migrate
npm run db:seed
npm start
```

## Перевірка коду та запуск тестів

```bash
npm test
npm run lint
```

## Структура репозиторію

```text
node3/
├── .husky/                     # Git-хуки (pre-commit, pre-push)
├── ai/                         # Матеріали та історія роботи з ШІ
│   ├── lab1/
│   └── lab2/
│       └── prompts.md          # Логи та промпти взаємодії з ШІ
├── db/                         # База даних: міграції та скрипти
│   ├── migrations/
│   │   └── 001_initial.sql     # Початкова міграція схеми БД
│   ├── clear.sql               # Скрипт очищення таблиць
│   └── seed.sql                # Початкові дані для заповнення (seed)
├── docs/                       # Проєктна документація
│   ├── adr/                    # Архітектурні рішення (Architectural Decision Records)
│   ├── diagrams/               # Архітектурні діаграми
│   └── api.md                  # Документація API ендпоінтів
├── src/                        # Вихідний код бекенду (TypeScript)
│   ├── __tests__/              # Модульні та інтеграційні тести
│   ├── db/
│   │   ├── database.ts         # Налаштування пулу підключення до PostgreSQL
│   │   └── runSqlFile.ts       # Утиліта для виконання SQL-файлів
│   ├── errors/
│   │   └── appError.ts         # Кастомний клас бізнес-помилок з HTTP-статусами
│   ├── middleware/
│   │   ├── authenticateUserHook.ts # Хук перевірки заголовоку X-User-Id
│   │   └── globalErrorHandler.ts   # Глобальний обробник помилок
│   ├── repositories/           # Шар доступу до даних (SQL-запити)
│   │   ├── gradesRepositories.ts
│   │   ├── lessonsRepositories.ts
│   │   ├── subjectsRepositories.ts
│   │   └── usersRepositories.ts
│   ├── routes/                 # HTTP-маршрути Fastify
│   ├── schemas/                # Схеми валідації вхідних даних (Fastify schemas)
│   ├── services/               # Бізнес-логіка та оркестрація
│   │   ├── gradesServices.ts
│   │   ├── lessonsServices.ts
│   │   ├── subjectsServices.ts
│   │   └── usersServices.ts
│   ├── types/
│   │   └── domain.ts           # Доменні типи та інтерфейси TypeScript
│   ├── app.ts                  # Ініціалізація та конфігурація Fastify
│   └── server.ts               # Точка входу (запуск HTTP-сервера)
├── standards/                  # Стандарти розробки та чеклисти
│   ├── adr_format.md
│   ├── checks.md
│   ├── definition_of_done.md
│   └── spec_format.md
├── .env.example                # Шаблон змінних середовища
├── .gitignore                  # Ігноровані Git файли
├── .prettierrc                 # Налаштування форматування Prettier
├── audit.md                    # Звіт з архітектурного аудиту
├── eslint.config.js            # Конфігурація лінтера ESLint
├── Makefile                    # Команди автоматизації збірки/запуску (`make check`, тощо)
├── package-lock.json           # Фіксація версій пакетів npm
├── package.json                # Залежності та npm-скрипти
├── README.md                   # Головна документація проєкту
├── spec.md                     # Інженерна специфікація проєкту
└── tsconfig.json               # Конфігурація компілятора TypeScript
```

## Інші документи

[spec.md — інженерний опис](./spec.md)  
[docs/diagrams — діаграми](./docs/diagrams/)
[docs/adr - архітектурні рішення](./docs/adr/)
[standards - стандарти розробки](./standards/)
