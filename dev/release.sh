#!/usr/bin/env bash
# Release Lamp: bump ?v=, commit, tag, push, GitHub release with lamp-X.Y.Z.tar.gz,
# then point homelab-ansible at it (if checked out next to this repo; not committed there).
# Usage: dev/release.sh 1.0.1 ["Release notes"]
set -euo pipefail
cd "$(dirname "$0")/.."

new=${1:?usage: dev/release.sh X.Y.Z [notes]}
notes=${2:-}
[[ $new =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "version must be X.Y.Z" >&2; exit 1; }
[[ -z $(git status --porcelain) ]] || { echo "working tree not clean" >&2; exit 1; }
[[ $(git branch --show-current) == main ]] || { echo "not on main" >&2; exit 1; }
git rev-parse -q --verify "refs/tags/v$new" >/dev/null && { echo "tag v$new exists" >&2; exit 1; }

old=$(sed -n 's/.*app\.js?v=\([0-9.]*\).*/\1/p' src/index.html)
[[ -n $old ]] || { echo "no ?v= in src/index.html" >&2; exit 1; }
sed -i '' "s/?v=$old\"/?v=$new\"/g" src/index.html src/app.js
[[ $(grep -c "?v=$new\"" src/index.html src/app.js | awk -F: '{s+=$2} END {print s}') -eq 3 ]] \
  || { git checkout -- src; echo "expected 3 ?v= bumps (index.html x2, app.js x1)" >&2; exit 1; }

tmp=$(mktemp -d); trap 'rm -rf "$tmp"' EXIT
cp -R src "$tmp/lamp"
archive="$tmp/lamp-$new.tar.gz"
COPYFILE_DISABLE=1 tar -C "$tmp" -czf "$archive" lamp # no macOS ._ files in the archive
sha=$(shasum -a 256 "$archive" | cut -d' ' -f1)

git commit -qam "Release $new"
git tag -a "v$new" -m "Lamp $new"
git push -q origin main "v$new"
if [[ -n $notes ]]; then
  gh release create "v$new" "$archive" --title "Lamp $new" --notes "$notes"
else
  gh release create "v$new" "$archive" --title "Lamp $new" --generate-notes
fi

defaults=../homelab-ansible/roles/olivetin/defaults/main.yml
if [[ -f $defaults ]]; then
  sed -i '' -e "s/^olivetin_lamp_version: .*/olivetin_lamp_version: $new/" \
            -e "s/^olivetin_lamp_sha256: .*/olivetin_lamp_sha256: $sha/" "$defaults"
  echo "homelab-ansible updated (review, commit, make panel)"
fi
echo "v$new sha256 $sha"
