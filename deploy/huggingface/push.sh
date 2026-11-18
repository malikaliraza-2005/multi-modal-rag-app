#!/usr/bin/env sh
# Push the API to a Hugging Face Space.
#
# A Space is its own git repository, and it needs a layout the project does not
# use: requirements.txt and packages.txt at the root, an app.py entry point,
# and a README carrying YAML frontmatter that would render as a stray table on
# GitHub. So rather than adding the Space as a second remote, this assembles
# that layout in a clone of the Space and pushes it.
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
HERE="$ROOT/deploy/huggingface"
WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "Cloning $SPACE_URL"
git clone --depth 1 "$SPACE_URL" "$WORK/space"
SPACE="$WORK/space"

echo "Assembling the Space"

# The Gradio SDK looks for these three at the repository root.
cp "$HERE/app.py"                "$SPACE/app.py"
cp "$HERE/README.md"             "$SPACE/README.md"
cp "$ROOT/api/requirements.txt"  "$SPACE/requirements.txt"

# apt packages: what unstructured shells out to. poppler rasterises PDF pages,
# tesseract does OCR, libmagic sniffs types, libgl is OpenCV's runtime.
cp "$ROOT/packages.txt"          "$SPACE/packages.txt"

# The application itself. Removed first so a file deleted upstream does not
# linger in the Space forever.
rm -rf "$SPACE/api" "$SPACE/scripts"
mkdir -p "$SPACE/api" "$SPACE/scripts"
cp "$ROOT"/api/*.py "$SPACE/api/"
cp "$ROOT"/scripts/*.py "$SPACE/scripts/" 2>/dev/null || true

cd "$SPACE"

if [ -z "$(git status --porcelain)" ]; then
    echo "Nothing changed — the Space is already up to date."
    exit 0
fi

git add -A
git status --short
git commit -m "$MESSAGE"
git push

echo
echo "Pushed. The Space will rebuild — watch the Logs tab."
echo "The first build is slow: apt packages, then ~2 GB of Python dependencies."
