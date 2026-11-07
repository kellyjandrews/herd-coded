TF = terraform -chdir=infra/terraform

.PHONY: bootstrap dev verify e2e infra-init infra-plan infra-apply status

bootstrap:      ## one-time setup: repo, Vercel, secrets, first deploy
	./scripts/bootstrap.sh

dev:            ## local dev server
	npm run dev

verify:         ## lint + typecheck + unit tests
	npm run verify

e2e:            ## e2e locally, or `make e2e URL=https://...` against a preview
	BASE_URL=$(URL) npm run test:e2e

infra-init:
	GITHUB_TOKEN=$$(gh auth token) $(TF) init -upgrade

infra-plan:
	GITHUB_TOKEN=$$(gh auth token) $(TF) plan

infra-apply:
	GITHUB_TOKEN=$$(gh auth token) $(TF) apply

status:         ## open PRs and recent runs
	gh pr list --label factory; gh run list --limit 8
