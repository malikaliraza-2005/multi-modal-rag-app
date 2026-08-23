#!/usr/bin/env sh
# Push the API to a Hugging Face Space.
#
# A Space is its own git repository, and it needs a different README from the
# one GitHub shows — HF reads deployment settings out of YAML frontmatter that
# would render as a stray table on GitHub. So rather than adding the Space as a
# second remote, this syncs the handful of files the image actually needs into
# a clone of the Space and pushes that.
#
#   sh deploy/huggingface/push.sh <space-url> ["commit message"]
#
# Example:
#   sh deploy/huggingface/push.sh https://huggingface.co/spaces/malikaliraza/asterism-api
#
# Authentication: HF asks for a username and an access token as the password.
# Create one at https://huggingface.co/settings/tokens with write permission.

set -eu

SPACE_URL="${1:-}"
MESSAGE="${2:-Deploy API}"

if [ -z "$SPACE_URL" ]; then
    sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'
    exit 2
fi

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "Cloning $SPACE_URL"
git clone --depth 1 "$SPACE_URL" "$WORK/space"

echo "Syncing files"
# Everything the image needs, and nothing else. The web app and the runtime
# data directories are deliberately absent.
cp "$ROOT/Dockerfile"                      "$WORK/space/Dockerfile"
cp "$ROOT/.dockerignore"                   "$WORK/space/.dockerignore"
cp "$ROOT/deploy/huggingface/README.md"    "$WORK/space/README.md"

rm -rf "$WORK/space/api" "$WORK/space/scripts"
mkdir -p "$WORK/space/api" "$WORK/space/scripts"
cp "$ROOT"/api/*.py "$ROOT/api/requirements.txt" "$WORK/space/api/"
cp "$ROOT"/scripts/*.py "$WORK/space/scripts/" 2>/dev/null || true

cd "$WORK/space"

if git diff --quiet && git diff --cached --quiet && [ -z "$(git status --porcelain)" ]; then
    echo "Nothing changed — the Space is already up to date."
    exit 0
fi

git add -A
git status --short
git commit -m "$MESSAGE"
git push

echo
echo "Pushed. The Space will rebuild — watch the Logs tab."
echo "First build is slow: it installs ~2 GB of dependencies and bakes in the models."
