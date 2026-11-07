variable "project_name" {
  description = "Vercel project name (lowercase, dashes)."
  type        = string
}

variable "vercel_api_token" {
  description = "Vercel token — used by Terraform and stored as the VERCEL_TOKEN Actions secret."
  type        = string
  sensitive   = true
}

variable "vercel_team_id" {
  description = "Vercel team ID (team_...). Required: CI uses it as VERCEL_ORG_ID."
  type        = string
}

variable "github_owner" {
  description = "GitHub user or org that owns the repo."
  type        = string
}

variable "github_repo" {
  description = "Existing GitHub repo name (create it first with `gh repo create`)."
  type        = string
}

variable "custom_domain" {
  description = "Optional production domain, e.g. demo.example.com. Empty = <project>.vercel.app."
  type        = string
  default     = ""
}

variable "preview_protection" {
  description = "Require Vercel login to view previews. Turn off if judges need to open preview links."
  type        = bool
  default     = true
}

variable "require_pr_for_main" {
  description = "Branch protection: main only changes through PRs with a green `verify` check."
  type        = bool
  default     = true
}

variable "neon_project_id" {
  description = "Optional Neon project ID. Set to enable a database branch per PR."
  type        = string
  default     = ""
}

variable "neon_api_key" {
  description = "Neon API key (needed only with neon_project_id)."
  type        = string
  default     = ""
  sensitive   = true
}

variable "production_database_url" {
  description = "Optional production DATABASE_URL (Neon main branch). Used for migrations and at runtime."
  type        = string
  default     = ""
  sensitive   = true
}

variable "app_env_vars" {
  description = <<-EOT
    App environment variables to set in Vercel.
    Map of KEY => { value, targets = ["production","preview","development"], sensitive = true }.
  EOT
  type = map(object({
    value     = string
    targets   = optional(list(string), ["production", "preview"])
    sensitive = optional(bool, true)
  }))
  default   = {}
  sensitive = true
}
