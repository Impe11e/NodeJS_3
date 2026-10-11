.PHONY: check test lint format-check build smoke-test clean install

# Запуск усіх перевірок якості коду та тестів
check: install format-check lint test

# Запуск автотестів
test:
	npm run test

# Перевірка форматування
format-check:
	npm run format:check

# Перевірка лінтера
lint:
	npm run lint

# Симуляція збірки (перевірка синтаксису)
build:
	npm run build

# Smoke-тест для перевірки базової працездатності
smoke-test:
	npm run test:smoke

# Встановлення залежностей
install:
	npm ci