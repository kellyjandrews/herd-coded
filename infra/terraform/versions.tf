terraform {
  required_version = ">= 1.6"

  required_providers {
    vercel = {
      source  = "vercel/vercel"
      version = ">= 3.0" # pin to the version `terraform init` resolves, via the lock file
    }
    github = {
      source  = "integrations/github"
      version = ">= 6.0"
    }
  }

  # Local state is fine for a hackathon team of one. For a team, uncomment one:
  # backend "gcs"   { bucket = "my-tf-state" prefix = "ai-code-factory" }
  # cloud { organization = "my-org" workspaces { name = "ai-code-factory" } }
}

provider "vercel" {
  api_token = var.vercel_api_token
  team      = var.vercel_team_id
}

provider "github" {
  owner = var.github_owner
  # token comes from GITHUB_TOKEN env (bootstrap.sh sets it from `gh auth token`)
}
