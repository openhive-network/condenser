#!/usr/bin/env bash
# Build (and with --push, publish) the test runtime image of .aidev/runtime/Dockerfile
# and print the digest-pinned reference to put in .aidev/project.yaml's
# `environment.image`. See .aidev/README.md.
#
# The tag is `aidev-<hash>`, the hash of the image inputs (the Dockerfile,
# package.json, yarn.lock); the registry cleanup policy keeps `aidev-*` tags. When
# <repository>:aidev-<hash> is already in the registry nothing is built: the script
# prints that image's digest.
#
#   .aidev/runtime/build.sh           # registry digest, or build locally and print the local tag
#   .aidev/runtime/build.sh --push    # registry digest, or build + push and print repo@sha256:<digest>
#   .aidev/runtime/build.sh --tag     # print the input-hash tag only
set -euo pipefail

cd "$(dirname "$0")/../.."

REPOSITORY="${AIDEV_RUNTIME_REPOSITORY:-registry.gitlab.syncad.com/hive/condenser/aidev-tests}"

input_hash() {
    sha256sum .aidev/runtime/Dockerfile package.json yarn.lock | sha256sum | cut -c1-16
}
TAG="aidev-$(input_hash)"

case "${1:-}" in
    --tag) echo "$TAG"; exit 0 ;;
    ""|--push) ;;
    *) echo "usage: $0 [--push|--tag]" >&2; exit 2 ;;
esac

# Digest of <repository>:<tag> in the registry, empty when the tag doesn't exist.
registry_digest() {
    docker buildx imagetools inspect "$REPOSITORY:$TAG" --format '{{json .Manifest}}' 2>/dev/null \
        | grep -o '"digest": *"sha256:[0-9a-f]*"' | head -1 | grep -o 'sha256:[0-9a-f]*' || true
}

digest="$(registry_digest)"
if [ -n "$digest" ]; then
    echo "$REPOSITORY:$TAG exists in the registry; not building" >&2
    echo "$REPOSITORY@$digest"
    exit 0
fi
echo "$REPOSITORY:$TAG is not in the registry; building it" >&2

# Only the files the Dockerfile copies: the repository root holds node_modules.
context="$(mktemp -d)"
trap 'rm -rf "$context"' EXIT
cp package.json yarn.lock "$context/"

# buildx so it works with any builder (CI's docker-container builder keeps no local
# image); no provenance, so the pushed digest is a plain image manifest.
build=(docker buildx build --pull --provenance=false -f .aidev/runtime/Dockerfile -t "$REPOSITORY:$TAG")
if [ "${1:-}" != "--push" ]; then
    "${build[@]}" --load "$context" >&2
    echo "$REPOSITORY:$TAG"
    exit 0
fi

"${build[@]}" --push --metadata-file "$context/metadata.json" "$context" >&2
digest="$(grep -o '"containerimage.digest": *"sha256:[0-9a-f]*"' "$context/metadata.json" | grep -o 'sha256:[0-9a-f]*')"
echo "$REPOSITORY@${digest:?no digest in buildx metadata}"
