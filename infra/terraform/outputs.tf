output "vercel_project_id" {
  value = vercel_project.app.id
}

output "production_url" {
  value = local.production_url
}

output "next_steps" {
  value = <<-EOT
    1. Push to main → production deploys via .github/workflows/production.yml
    2. In VS Code Copilot Chat: /kickoff
    3. Every PR gets a preview URL comment from .github/workflows/preview.yml
  EOT
}
