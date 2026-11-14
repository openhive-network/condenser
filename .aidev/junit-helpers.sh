# Sourced, not executed, by the .aidev/run-*.sh scripts that write junit.
#
# run_with_junit_fallback JUNIT SUITE CMD...
#   Runs CMD, showing its output as usual. If CMD fails without leaving a
#   non-empty JUNIT behind (mocha crashed while loading the suite, e.g. a
#   TS2307 on an import, so its reporter never ran), writes a one-case junit
#   in its place: testcase "<SUITE> failed to load" with the tail of the output
#   as the failure. AIDEV then records why the suite failed instead of a failed
#   verdict with no per-test evidence. Returns CMD's exit status.
run_with_junit_fallback() {
    local junit="$1" suite="$2"
    shift 2
    local log status=0
    log="$(mktemp)"
    "$@" 2>&1 | tee "$log" || status=${PIPESTATUS[0]}
    if [ "$status" -ne 0 ] && [ ! -s "$junit" ]; then
        mkdir -p "$(dirname "$junit")"
        JUNIT="$junit" SUITE="$suite" LOG="$log" STATUS="$status" node -e '
const fs = require("fs");
const esc = (s) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" })[c]);
const tail = fs.readFileSync(process.env.LOG, "utf8").split("\n").slice(-60).join("\n");
const suite = esc(process.env.SUITE);
const message = esc(`${process.env.SUITE} exited ${process.env.STATUS} without writing a test report`);
fs.writeFileSync(process.env.JUNIT,
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<testsuite name="${suite}" tests="1" failures="1" errors="0" skipped="0">\n` +
  `<testcase classname="${suite}" name="${suite} failed to load">` +
  `<failure message="${message}">${esc(tail)}</failure></testcase>\n</testsuite>\n`);
' < /dev/null
        echo "junit: ${junit} written as a load failure (${suite} exited ${status} without a report)" >&2
    fi
    rm -f "$log"
    return "$status"
}

# junit_add_unreported_failure JUNIT SUITE CASE LOG STATUS [ANCHOR]
#   For a run that exited STATUS (non-zero) while JUNIT shows no failing test,
#   e.g. Playwright failing the run from globalTeardown after every test passed.
#   Adds testcase CASE to JUNIT (creating it if missing) and bumps the root
#   tests/failures counts, so a junit reader sees the failure. The failure text
#   is LOG from the line containing ANCHOR up to its stack trace, or LOG's tail
#   when ANCHOR is not given. Does nothing if JUNIT already reports a failure.
junit_add_unreported_failure() {
    JUNIT="$1" SUITE="$2" CASE="$3" LOG="$4" STATUS="$5" ANCHOR="${6:-}" node -e '
const fs = require("fs");
const { JUNIT, SUITE, CASE, LOG, STATUS, ANCHOR } = process.env;
const esc = (s) => s.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" })[c]);
const existing = fs.existsSync(JUNIT) ? fs.readFileSync(JUNIT, "utf8") : "";
if (/<(failure|error)\b/.test(existing)) process.exit(0);

const lines = fs.readFileSync(LOG, "utf8")
  .replace(/\x1b\[[0-9;]*[A-Za-z]/g, "")
  .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
  .split("\n");
const start = ANCHOR ? lines.findIndex((l) => l.includes(ANCHOR)) : -1;
let message = `${SUITE} exited ${STATUS} with no failing test in its report`;
let details = lines.slice(-60);
if (start >= 0) {
  const after = lines.slice(start, start + 200);
  const stack = after.findIndex((l) => /^\s+at\s/.test(l));
  details = stack > 0 ? after.slice(0, stack) : after;
  message = details[0].trim();
}
const testsuite =
  `<testsuite name="${esc(SUITE)}" tests="1" failures="1" errors="0" skipped="0">\n` +
  `<testcase classname="${esc(SUITE)}" name="${esc(CASE)}">` +
  `<failure message="${esc(message)}">${esc(details.join("\n"))}</failure></testcase>\n</testsuite>\n`;

let xml;
if (/<\/testsuites>/.test(existing)) {
  xml = existing
    .replace(/<testsuites\b[^>]*>/, (tag) =>
      tag.replace(/\b(tests|failures)="(\d*)"/g, (_, attr, n) => `${attr}="${(Number(n) || 0) + 1}"`))
    .replace(/<\/testsuites>/, `${testsuite}</testsuites>`);
} else {
  const body = existing.replace(/^<\?xml[^>]*\?>\s*/, "");
  xml = `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites>\n${body}${testsuite}</testsuites>\n`;
}
fs.mkdirSync(require("path").dirname(JUNIT), { recursive: true });
fs.writeFileSync(JUNIT, xml);
console.error(`junit: ${JUNIT}: added failing case "${CASE}" (${SUITE} exited ${STATUS} with no failing test reported)`);
' < /dev/null
}

# junit_write_cases JUNIT SUITE CASES
#   For a suite whose cases are steps of a script rather than a test runner's
#   tests. CASES is a file of tab-separated lines the script appended as it went:
#     case<TAB>NAME<TAB>pass|fail|skip<TAB>SECONDS<TAB>MESSAGE[<TAB>LOG]
#     property<TAB>NAME<TAB>VALUE
#   Writes JUNIT as one testsuite SUITE: a case per `case` line, its failure body
#   the tail of LOG when given, and every `property` on the testsuite.
junit_write_cases() {
    JUNIT="$1" SUITE="$2" CASES="$3" node -e '
const fs = require("fs");
const { JUNIT, SUITE, CASES } = process.env;
const esc = (s) => String(s).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" })[c]);
const tail = (log) => {
  if (!log || !fs.existsSync(log)) return "";
  return fs.readFileSync(log, "utf8").replace(/\x1b\[[0-9;]*[A-Za-z]/g, "")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "").split("\n").slice(-80).join("\n");
};
const cases = [];
const props = [];
for (const line of fs.readFileSync(CASES, "utf8").split("\n")) {
  const [kind, ...f] = line.split("\t");
  if (kind === "case") cases.push({ name: f[0], status: f[1], time: Number(f[2]) || 0, message: f[3] || "", log: f[4] });
  else if (kind === "property") props.push({ name: f[0], value: f[1] ?? "" });
}
const count = (s) => cases.filter((c) => c.status === s).length;
const time = cases.reduce((t, c) => t + c.time, 0);
const body = cases.map((c) => {
  const open = `<testcase classname="${esc(SUITE)}" name="${esc(c.name)}" time="${c.time}">`;
  if (c.status === "fail") return `${open}<failure message="${esc(c.message)}">${esc(tail(c.log))}</failure></testcase>`;
  if (c.status === "skip") return `${open}<skipped message="${esc(c.message)}"/></testcase>`;
  return `${open}</testcase>`;
});
const properties = props.length
  ? `<properties>\n${props.map((p) => `<property name="${esc(p.name)}" value="${esc(p.value)}"/>`).join("\n")}\n</properties>\n`
  : "";
fs.mkdirSync(require("path").dirname(JUNIT), { recursive: true });
fs.writeFileSync(JUNIT,
  `<?xml version="1.0" encoding="UTF-8"?>\n` +
  `<testsuite name="${esc(SUITE)}" tests="${cases.length}" failures="${count("fail")}" errors="0" skipped="${count("skip")}" time="${time}">\n` +
  properties + body.join("\n") + `\n</testsuite>\n`);
' < /dev/null
}
