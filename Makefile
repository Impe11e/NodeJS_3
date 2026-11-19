.PHONY: check test lint format-check build smoke-test clean install proxy-up proxy-down up down logs db-port url

BRANCH := $(shell git rev-parse --abbrev-ref HEAD)
SLUG := $(shell echo '$(BRANCH)' | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$$//' | cut -c1-40)
export COMPOSE_PROJECT_NAME := node3-$(SLUG)
export APP_HOST := $(SLUG).node3.localhost
export GIT_COMMIT_SHA := $(shell git rev-parse HEAD)

# Запуск усіх перевірок якості коду та тестів
check: install format-check lint build test

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

proxy-up:
	docker compose -p traefik -f docker-compose.proxy.yml up -d

proxy-down:
	docker compose -p traefik -f docker-compose.proxy.yml down

up: proxy-up
	docker compose up -d --build --wait app
	@echo "App: http://$(APP_HOST)"
	@echo "DB:  $$(docker compose port db 5432)"

down:
	docker compose down

clean:
	docker compose down -v

logs:
	docker compose logs -f app

db-port:
	@docker compose port db 5432

url:
	@echo "http://$(APP_HOST)"
