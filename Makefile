.PHONY: dev test lint sync build up down clean

dev:
	docker compose up --build

build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose down

clean:
	docker compose down -v

test:
	cd backend && python -m pytest tests
	cd web-app/seka_kama && npm run typecheck

lint:
	cd backend && ruff check .
	cd web-app/seka_kama && npm run lint

sync:
	cd backend && python -m jobs.sync
