# Setup script for .env.local
# This script helps you create/update your .env.local file

$envExample = "env.example"
$envLocal = ".env.local"

Write-Host "`n=== MobileMate Environment Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
if (Test-Path $envLocal) {
    Write-Host "✓ .env.local already exists" -ForegroundColor Green
    Write-Host "  You can edit it manually in your IDE" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To edit: Open .env.local in your editor and add your values" -ForegroundColor Yellow
} else {
    Write-Host "Creating .env.local from env.example..." -ForegroundColor Yellow
    
    if (Test-Path $envExample) {
        Copy-Item $envExample $envLocal
        Write-Host "✓ Created .env.local" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "1. Open .env.local in your editor" -ForegroundColor White
        Write-Host "2. Fill in the required values:" -ForegroundColor White
        Write-Host "   - DATABASE_URL (from Neon)" -ForegroundColor White
        Write-Host "   - CLERK_SECRET_KEY (from Clerk dashboard)" -ForegroundColor White
        Write-Host "   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (from Clerk dashboard)" -ForegroundColor White
        Write-Host "   - TOKEN_ENCRYPTION_KEY (run: bun run generate:key)" -ForegroundColor White
        Write-Host ""
    } else {
        Write-Host "✗ env.example not found!" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "To generate encryption key, run:" -ForegroundColor Cyan
Write-Host "  bun run generate:key" -ForegroundColor White
Write-Host ""



