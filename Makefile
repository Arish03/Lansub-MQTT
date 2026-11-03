# Realtime MQTT Dashboard - Makefile
# Automated build, development, and operational lifecycle commands

.PHONY: help setup build up down restart logs status clean \
        dev-infra dev-backend dev-frontend migrate makemigrations test-backend test-frontend

.DEFAULT_GOAL := help

CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RESET := \033[0m

help: ## Show this help message
	@echo ""
	@echo "$(CYAN)Realtime MQTT Dashboard - Build & Management Automation$(RESET)"
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-18s$(RESET) %s\n", $$1, $$2}'
	@echo ""

setup: ## Initialize local environment files (.env)
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Creating .env from .env.example...$(RESET)"; \
		cp .env.example .env; \
		echo "$(GREEN).env created successfully. Please update any secret values.$(RESET)"; \
	else \
		echo "$(CYAN).env already exists.$(RESET)"; \
	fi

build: ## Build all Docker containers
	docker compose build

up: setup ## Start all services in the background (PostgreSQL, Mosquitto, Backend, Frontend)
	docker compose up -d --build

down: ## Stop and remove all containers
	docker compose down

restart: ## Restart all running services
	docker compose restart

logs: ## Tail real-time logs from all running containers
	docker compose logs -f

status: ## Show running container statuses
	docker compose ps

dev-infra: setup ## Start only the database and Mosquitto broker (for local bare-metal dev)
	docker compose up -d db mosquitto

dev-backend: ## Run FastAPI backend locally with hot reload (requires dev-infra running)
	@echo "$(CYAN)Starting FastAPI dev server...$(RESET)"
	cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

dev-frontend: ## Run Next.js frontend locally with hot reload
	@echo "$(CYAN)Starting Next.js dev server...$(RESET)"
	cd frontend && npm run dev

migrate: ## Run Alembic database migrations in the backend container
	docker compose exec backend alembic upgrade head

makemigrations: ## Generate a new Alembic migration revision (usage: make makemigrations MSG="add_field")
	docker compose exec backend alembic revision --autogenerate -m "$(MSG)"

test-backend: ## Run backend unit and integration test suite
	docker compose exec backend pytest -v

test-frontend: ## Run frontend lint and tests
	cd frontend && npm run lint

clean: ## Stop containers, remove volumes and temporary build artifacts
	docker compose down -v --remove-orphans
	@echo "$(GREEN)Cleaned up containers and docker volumes.$(RESET)"
