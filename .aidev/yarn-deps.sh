# Sourced by .aidev/run-checks.sh: make node_modules match yarn.lock, offline,
# from the image's yarn cache. A marker records the lockfile and Node it was
# installed for; it is written only after an install that succeeded, and an
# install whose tools don't resolve is redone.
lock_id="$(cat package.json yarn.lock | sha256sum | cut -d' ' -f1) $(node --version)"
marker=node_modules/.aidev-yarn-lock
if [ "$(cat "$marker" 2>/dev/null)" != "$lock_id" ] || [ ! -e node_modules/.bin/jest ] || [ ! -e node_modules/.bin/eslint ] || [ ! -e node_modules/.bin/webpack ]; then
    echo "node_modules is not current for yarn.lock: yarn install --offline" >&2
    yarn install --offline --non-interactive --frozen-lockfile --ignore-optional < /dev/null || return 1
    [ -e node_modules/.bin/jest ] && [ -e node_modules/.bin/eslint ] && [ -e node_modules/.bin/webpack ] \
        || { echo "yarn install left no jest/eslint/webpack" >&2; return 1; }
    printf '%s\n' "$lock_id" > "$marker.tmp" && mv "$marker.tmp" "$marker"
fi
