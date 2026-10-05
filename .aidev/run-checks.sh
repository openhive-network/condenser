#!/usr/bin/env bash
# The checks AIDEV's verification slots run (.aidev/project.yaml), as one junit
# report per suite: each named step is a test case, its log the failure body.
#
#   .aidev/run-checks.sh <suite> <step>...     steps: lint unit coverage build
#
#   lint       ESLint over src/ (package.json `ci:eslint`, CI's run-eslint job)
#   unit       Jest (package.json `test`), every test its own junit case in
#              $out/unit-junit.xml through the project's jest-junit reporter
#   coverage   the same Jest run with --coverage (package.json `ci:test`, CI's
#              run-unit-tests job); the report lands in $out/coverage
#   build      `yarn build`: webpack production bundle + babel to lib/. tmp/ is
#              created first, as the Dockerfile does.
set -uo pipefail
cd "$(dirname "$0")/.."

suite="${1:?usage: $0 <suite> <step>...}"; shift
out="test-results/aidev-$suite"
rm -rf "$out"; mkdir -p "$out"
cases="$out/cases.tsv"; : > "$cases"

# shellcheck source=yarn-deps.sh
if ! source .aidev/yarn-deps.sh; then
    printf 'case\tinstall\tfail\t0\tyarn install --offline failed\n' >> "$cases"
    source .aidev/junit-helpers.sh; junit_write_cases "$out/junit.xml" "$suite" "$cases"
    exit 1
fi
source .aidev/junit-helpers.sh

status=0
step() {
    local name="$1"; shift
    local log="$out/$name.log" t0=$SECONDS rc=0
    echo "== $name" >&2
    "$@" > "$log" 2>&1 < /dev/null || rc=$?
    if [ "$rc" -eq 0 ]; then
        printf 'case\t%s\tpass\t%s\t\n' "$name" "$((SECONDS - t0))" >> "$cases"
    else
        status=1; tail -40 "$log" >&2
        printf 'case\t%s\tfail\t%s\texit %s\t%s\n' "$name" "$((SECONDS - t0))" "$rc" "$log" >> "$cases"
    fi
}

jest_run() {
    JEST_JUNIT_OUTPUT_DIR="$out" JEST_JUNIT_OUTPUT_NAME="$1-junit.xml" \
        run_with_junit_fallback "$out/$1-junit.xml" "jest" \
        node_modules/.bin/jest -c src/test/unit/jest.config.js --ci "${@:2}"
}

build() {
    mkdir -p tmp  # webpack/utils/write-stats.js writes tmp/webpack-stats-prod.json (the Dockerfile does the same)
    yarn -s build
}

for s in "$@"; do
    case "$s" in
        lint) step lint node_modules/.bin/eslint src/ ;;
        unit) step unit jest_run unit ;;
        coverage) step coverage jest_run coverage --coverage --coverageDirectory="$out/coverage" ;;
        build) step build build ;;
        *) echo "unknown step: $s" >&2; exit 2 ;;
    esac
done
junit_write_cases "$out/junit.xml" "$suite" "$cases"
exit "$status"
