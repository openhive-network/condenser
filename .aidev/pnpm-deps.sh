# Sourced by .aidev/run-checks.sh: make node_modules match pnpm-lock.yaml without
# a network. A node_modules pnpm didn't install is replaced by a copy of the
# image's /opt/aidev-deps/node_modules, then `pnpm install --prefer-offline`
# reconciles it with this worktree's lockfile from the image's store; that works
# for registry packages, while the GitHub dependency (a tarball without an
# integrity hash, which pnpm always downloads) has to be in the copy already.
# A marker records the lockfile and Node it was installed for; it is written only
# after an install that succeeded, and an install whose tools don't resolve is
# redone.
lock_id="$(cat package.json pnpm-lock.yaml pnpm-workspace.yaml | sha256sum | cut -d' ' -f1) $(node --version)"
marker=node_modules/.aidev-pnpm-lock
if [ "$(cat "$marker" 2>/dev/null)" != "$lock_id" ] || [ ! -e node_modules/.bin/jest ] || [ ! -e node_modules/.bin/eslint ] || [ ! -e node_modules/.bin/webpack ]; then
    echo "node_modules is not current for pnpm-lock.yaml: pnpm install --prefer-offline" >&2
    if [ ! -e node_modules/.modules.yaml ]; then
        rm -rf node_modules && cp -a /opt/aidev-deps/node_modules node_modules || return 1
    fi
    pnpm install --prefer-offline --frozen-lockfile < /dev/null || return 1
    [ -e node_modules/.bin/jest ] && [ -e node_modules/.bin/eslint ] && [ -e node_modules/.bin/webpack ] \
        || { echo "pnpm install left no jest/eslint/webpack" >&2; return 1; }
    printf '%s\n' "$lock_id" > "$marker.tmp" && mv "$marker.tmp" "$marker"
fi
