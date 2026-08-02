# DAO Gasless Voting — task runner
# Usage: `make help`

SC   := sc
WEB  := web
RPC  := http://localhost:8545
# Anvil's default account #0 (public dev key — NEVER use on a real network)
PK   := 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

.DEFAULT_GOAL := help
.PHONY: help setup install test coverage anvil deploy dev daemon itest build clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

setup: ## One-time setup: install deps + run tests (runs setup.sh)
	@bash setup.sh

install: ## Install contract libs and frontend packages only
	@cd $(SC) && [ -d lib/forge-std ] || forge install foundry-rs/forge-std --no-git
	@cd $(SC) && [ -d lib/openzeppelin-contracts ] || forge install OpenZeppelin/openzeppelin-contracts --no-git
	@cd $(WEB) && [ -f .env.local ] || cp .env.example .env.local
	@cd $(WEB) && npm install

test: ## Run the smart-contract tests (25)
	@cd $(SC) && forge test -vv

coverage: ## Show contract test coverage
	@cd $(SC) && forge coverage

build: ## Compile contracts
	@cd $(SC) && forge build

anvil: ## Terminal 1 — start the local Ethereum node
	@anvil

deploy: ## Terminal 2 — deploy MinimalForwarder + DAO to the local node
	@cd $(SC) && forge script script/Deploy.s.sol --rpc-url $(RPC) --broadcast --private-key $(PK)

dev: ## Terminal 3 — start the frontend (http://localhost:3000)
	@cd $(WEB) && npm run dev

daemon: ## Terminal 4 — run the execution daemon (auto-executes approved proposals)
	@cd $(WEB) && npm run daemon

itest: ## Integration test of the gasless path (needs anvil+deploy+`npm run start` on :3010)
	@cd $(WEB) && RELAY_URL=http://localhost:3010 node scripts/itest.mjs

clean: ## Remove build artifacts
	@cd $(SC) && forge clean
	@rm -rf $(WEB)/.next
