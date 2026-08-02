# E-Commerce on-chain — task runner
.DEFAULT_GOAL := help
.PHONY: help up stop test coverage

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

up: ## Boot the whole system (anvil + deploy + 4 apps)
	@./restart-all.sh

stop: ## Stop anvil and all app servers
	@pkill -f anvil 2>/dev/null || true
	@for p in 6001 6002 6003 6004; do pkill -f "next.*$$p" 2>/dev/null || true; done
	@echo "detenido"

test: ## Run all contract tests
	@echo "== EuroToken ==" && cd stablecoin/sc && forge test
	@echo "== Ecommerce ==" && cd sc-ecommerce && forge test

coverage: ## Contract coverage
	@cd sc-ecommerce && forge coverage
