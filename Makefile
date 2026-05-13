# Makefile
.PHONY: help build up down logs clean dev prod

help:
	@echo "Available commands:"
	@echo "  make build    - Build all Docker images"
	@echo "  make up       - Start all services"
	@echo "  make down     - Stop all services"
	@echo "  make logs     - View logs"
	@echo "  make clean    - Remove containers, volumes, and images"
	@echo "  make dev      - Run development environment"
	@echo "  make prod     - Run production environment"
	@echo "  make test     - Run tests"

build:
	docker-compose build

up:
	docker-compose up -d

down:
	docker-compose down

logs:
	docker-compose logs -f

clean:
	docker-compose down -v
	docker system prune -af

dev:
	docker-compose -f docker-compose.dev.yml up --build

prod:
	docker-compose -f docker-compose.yml --profile production up --build -d

test:
	docker-compose run --rm backend pytest

shell-backend:
	docker-compose exec backend bash

shell-frontend:
	docker-compose exec frontend sh

shell-postgis:
	docker-compose exec postgis psql -U sekakama_user -d sekakama

init-db:
	docker-compose exec postgis psql -U sekakama_user -d sekakama -f /docker-entrypoint-initdb.d/init.sql