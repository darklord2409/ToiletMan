.PHONY: up down build logs ps restart migrate revision shell-backend shell-bot shell-admin shell-db clean

up:
	docker compose up -d --build

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

ps:
	docker compose ps

restart:
	docker compose restart

migrate:
	docker compose exec backend alembic upgrade head

revision:
	docker compose exec backend alembic revision --autogenerate -m "$(m)"

shell-backend:
	docker compose exec backend sh

shell-bot:
	docker compose exec bot sh

shell-admin:
	docker compose exec admin sh

shell-db:
	docker compose exec postgres psql -U $${POSTGRES_USER:-tipobot} -d $${POSTGRES_DB:-tipobot}

clean:
	docker compose down -v
