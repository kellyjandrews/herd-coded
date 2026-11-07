# ── Vercel project ─────────────────────────────────────────────────────────────
# Not connected to Git on purpose: GitHub Actions builds and deploys with the
# Vercel CLI, so tests gate production and there are no duplicate deployments.

resource "vercel_project" "app" {
  name      = var.project_name
  framework = "nextjs"

  vercel_authentication = {
    deployment_type = var.preview_protection ? "standard_protection" : "none"
  }
}

# Lets CI (curl smoke tests, Playwright) through Deployment Protection.
resource "vercel_project_protection_bypass" "ci" {
  project_id = vercel_project.app.id
  note       = "github-actions"
  is_env_var = true
}

# ── App environment variables ─────────────────────────────────────────────────
locals {
  base_env = {
    USE_MOCKS = { value = "false", targets = ["production"], sensitive = false }
  }
  db_env = var.production_database_url == "" ? {} : {
    DATABASE_URL = { value = var.production_database_url, targets = ["production"], sensitive = true }
  }
  # nonsensitive() on keys only, so for_each can iterate a sensitive map
  all_env = merge(local.base_env, local.db_env, var.app_env_vars)
}

resource "vercel_project_environment_variable" "app" {
  for_each = nonsensitive(toset(keys(local.all_env)))

  project_id = vercel_project.app.id
  key        = each.key
  value      = local.all_env[each.key].value
  target     = local.all_env[each.key].targets
  sensitive  = local.all_env[each.key].sensitive && !contains(local.all_env[each.key].targets, "development")
}

# ── Custom domain (optional) ──────────────────────────────────────────────────
resource "vercel_project_domain" "prod" {
  count      = var.custom_domain == "" ? 0 : 1
  project_id = vercel_project.app.id
  domain     = var.custom_domain
}

locals {
  production_url = var.custom_domain != "" ? "https://${var.custom_domain}" : "https://${var.project_name}.vercel.app"
}
