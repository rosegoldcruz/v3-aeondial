#!/bin/bash
# deploy.sh — AEON Dial v3 forced deploy + restart
# Usage: bash /opt/aeondial-v3/deploy.sh "your commit message"
# Or:    bash /opt/aeondial-v3/deploy.sh  (uses default message)

set -e

REPO_DIR="/opt/aeondial-v3"
APP_NAME="aeondial"
COMMIT_MSG="${1:-"chore: deploy $(date '+%Y-%m-%d %H:%M:%S')"}"
BRANCH="main"

echo ""
echo "══════════════════════════════════════════"
echo "  🦊 AEON Dial v3 — Deploy Script"
echo "══════════════════════════════════════════"
echo ""

cd "$REPO_DIR"

# ── 1. Git config (needed for root user on server) ──────────────────────────
echo "▶ Configuring git..."
git config user.email "deploy@aeondial.com"
git config user.name "AEON Deploy"

# ── 2. Stage ALL changes including untracked files ──────────────────────────
echo "▶ Staging all changes..."
git add -A

# ── 3. Commit (skip if nothing to commit) ───────────────────────────────────
if git diff --cached --quiet; then
  echo "  ℹ Nothing new to commit — proceeding with rebuild anyway"
else
  echo "▶ Committing: $COMMIT_MSG"
  git commit -m "$COMMIT_MSG"
fi

# ── 4. Force push to main ────────────────────────────────────────────────────
echo "▶ Force pushing to origin/$BRANCH..."
git push origin "$BRANCH" --force
echo "  ✓ Pushed to GitHub"

# ── 5. Install any new dependencies ─────────────────────────────────────────
echo "▶ Installing dependencies..."
npm install --no-audit --no-fund --silent
echo "  ✓ Dependencies up to date"

# ── 6. Production build ──────────────────────────────────────────────────────
echo "▶ Building..."
npm run build
echo "  ✓ Build complete"

# ── 7. Typecheck (non-blocking — warns but doesn't stop deploy) ──────────────
echo "▶ Typechecking..."
if npx tsc --noEmit; then
  echo "  ✓ TypeScript clean"
else
  echo "  ⚠ TypeScript errors detected — deploy continues (fix before next push)"
fi

# ── 8. Restart PM2 with updated env ─────────────────────────────────────────
echo "▶ Restarting PM2 ($APP_NAME)..."
pm2 restart "$APP_NAME" --update-env
sleep 3

# ── 9. Reload nginx ──────────────────────────────────────────────────────────
echo "▶ Reloading nginx..."
nginx -t && systemctl reload nginx
echo "  ✓ Nginx reloaded"

# ── 10. Verify health ────────────────────────────────────────────────────────
echo "▶ Verifying health..."
sleep 2

HEALTH=$(curl -s --max-time 10 https://crm.aeondial.com/api/health || echo "FAILED")

if echo "$HEALTH" | grep -q '"healthy"'; then
  echo "  ✓ App is healthy: $HEALTH"
else
  echo "  ✗ Health check failed: $HEALTH"
  echo "  Run: pm2 logs $APP_NAME --lines 50"
  exit 1
fi

AUTH=$(curl -s --max-time 10 https://auth.aeondial.com/debug/ready || echo "FAILED")
if echo "$AUTH" | grep -q "ok"; then
  echo "  ✓ ZITADEL: ok"
else
  echo "  ⚠ ZITADEL check: $AUTH"
fi

# ── 11. Print summary ────────────────────────────────────────────────────────
echo ""
echo "══════════════════════════════════════════"
echo "  ✅ Deploy complete"
echo "  Commit: $(git rev-parse --short HEAD)"
echo "  Branch: $BRANCH"
echo "  App:    https://crm.aeondial.com"
echo "  Auth:   https://auth.aeondial.com"
echo "  NocoDB: https://noco.aeondial.com"
echo "══════════════════════════════════════════"
echo ""
