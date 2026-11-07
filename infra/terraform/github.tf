# ── GitHub repo wiring: secrets, variables, environments, branch protection ────

data "github_repository" "repo" {
  name = var.github_repo
}

locals {
  actions_secrets = merge(
    {
      VERCEL_TOKEN                    = var.vercel_api_token
      VERCEL_AUTOMATION_BYPASS_SECRET = vercel_project_protection_bypass.ci.secret
    },
    var.neon_api_key == "" ? {} : { NEON_API_KEY = var.neon_api_key },
    var.production_database_url == "" ? {} : { PRODUCTION_DATABASE_URL = var.production_database_url },
  )

  actions_variables = merge(
    {
      VERCEL_ORG_ID     = var.vercel_team_id
      VERCEL_PROJECT_ID = vercel_project.app.id
      PRODUCTION_URL    = local.production_url
    },
    var.neon_project_id == "" ? {} : { NEON_PROJECT_ID = var.neon_project_id },
  )
}

resource "github_actions_secret" "this" {
  for_each        = nonsensitive(toset(keys(local.actions_secrets)))
  repository      = data.github_repository.repo.name
  secret_name     = each.key
  plaintext_value = local.actions_secrets[each.key]
}

resource "github_actions_variable" "this" {
  for_each      = local.actions_variables
  repository    = data.github_repository.repo.name
  variable_name = each.key
  value         = each.value
}

resource "github_repository_environment" "preview" {
  repository  = data.github_repository.repo.name
  environment = "preview"
}

resource "github_repository_environment" "production" {
  repository  = data.github_repository.repo.name
  environment = "production"

  # Only protected branches (main) may deploy to production.
  dynamic "deployment_branch_policy" {
    for_each = var.require_pr_for_main ? [1] : []
    content {
      protected_branches     = true
      custom_branch_policies = false
    }
  }
}

resource "github_issue_label" "factory" {
  repository  = data.github_repository.repo.name
  name        = "factory"
  color       = "c084fc"
  description = "Created or built by the AI code factory"
}

resource "github_branch_protection" "main" {
  count         = var.require_pr_for_main ? 1 : 0
  repository_id = data.github_repository.repo.node_id
  pattern       = "main"

  required_status_checks {
    strict   = false
    contexts = ["verify"]
  }

  # A PR is required, but no human approval. Raise the approval count when the project needs it.
  required_pull_request_reviews {
    required_approving_review_count = 0
  }

  allows_force_pushes = false
  enforce_admins      = false
}
