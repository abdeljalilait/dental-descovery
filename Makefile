# Dentora — task runner. `make all` is the gate everything else builds on.
#
#   make            typecheck, lint and build the container image
#   make push       push the image to registry.hakiware.com
#   make dev        run the dev server
#   make db-update  apply prisma/contract.prisma to the database
#   make backup     dump the database to a compressed file
#   make restore    load a dump back into the database

SHELL := /bin/bash
.DEFAULT_GOAL := all
.NOTPARALLEL:

REGISTRY ?= registry.hakiware.com
IMAGE    ?= dentora
NAMESPACE ?= $(shell git config --get user.email 2>/dev/null | sed 's/@.*//' || echo dentora)
FULL_IMAGE ?= $(REGISTRY)/$(NAMESPACE)/$(IMAGE)
TAG      ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo dev)

# The route tree prerenders from PostgreSQL, so the build needs a reachable
# URL. From inside a build container the host is host.docker.internal; override
# on the command line when building against something else:
#   make image BUILD_DATABASE_URL=postgresql://user:pass@db:5432/dental_discovery
BUILD_DATABASE_URL ?= postgresql://postgres:postgrespassword@host.docker.internal:5432/dental_discovery?schema=public
BUILD_SITE_URL      ?= https://dentora.ma

export DATABASE_URL
DATABASE_URL ?= $(shell sed -n 's/^DATABASE_URL="\(.*\)"/\1/p' .env.local)

.PHONY: all deps check typecheck lint image push dev build start stop logs shell \
        db-generate db-update backup restore clean help

all: check image

## deps: install dependencies from the lockfile
deps:
	npm ci

## check: static checks - types then lint
check: typecheck lint

typecheck:
	npx tsc --noEmit

lint:
	npm run lint

## image: build the container image for the registry
image:
	docker build \
		--build-arg DATABASE_URL="$(BUILD_DATABASE_URL)" \
		--build-arg NEXT_PUBLIC_SITE_URL="$(BUILD_SITE_URL)" \
		-t "$(FULL_IMAGE):$(TAG)" \
		-t "$(FULL_IMAGE):latest" \
		-f Dockerfile .

push: image
	docker push "$(FULL_IMAGE):$(TAG)"
	docker push "$(FULL_IMAGE):latest"
	@echo "Pushed $(FULL_IMAGE):$(TAG)"

## build: local production build, no container
build:
	npm run build

## start: run the built image locally
start:
	docker run --rm -p 3000:3000 --env-file .env.local "$(FULL_IMAGE):$(TAG)"

dev:
	npm run dev

## db-update: emit the contract and apply the schema
db-generate:
	npx prisma contract emit

db-update:
	npx prisma contract emit && npx prisma db update

backup:
	@test -n "$(DATABASE_URL)" || { echo "DATABASE_URL not found in .env.local"; exit 1; }
	./scripts/backup-db.sh

restore:
	@test -n "$(DATABASE_URL)" || { echo "DATABASE_URL not found in .env.local"; exit 1; }
	@test -n "$(DUMP)" || { echo "usage: make restore DUMP=backup.sql.gz"; exit 1; }
	./scripts/restore-db.sh "$(DUMP)"

logs:
	docker compose logs -f

shell:
	docker compose run --rm web sh

clean:
	rm -rf .next
	docker image rm "$(FULL_IMAGE):$(TAG)" 2>/dev/null || true

help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed -e 's/^## //' | awk '{printf "  %s\n", $$0}'