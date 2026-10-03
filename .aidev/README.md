# condenser under AIDEV

AIDEV verifies changes through the slots in `project.yaml`, integrates them into
`aidev/integration`, and people merge that into `develop` through merge requests (as in
hive/denser and hive/block_explorer_ui). GitLab CI doesn't run for AIDEV branches;
see `.gitlab-ci.yml` `workflow:`.

## Suites

`.aidev/run-checks.sh <suite> <step>...` writes `test-results/aidev-<suite>/junit.xml`
(one case per step) and, for `unit`/`coverage`, `<step>-junit.xml` (one case per Jest
test, from the project's own jest-junit reporter).

| Step | What |
|---|---|
| `lint` | `eslint src/` (`ci:eslint`, CI's run-eslint job). Warnings don't fail it |
| `unit` | Jest (`yarn test`) |
| `coverage` | Jest with `--coverage` (`ci:test`, CI's run-unit-tests job); report in `test-results/aidev-coverage/coverage` |
| `build` | `yarn build` (webpack production bundle, babel to `lib/`). The bundle's VERSION comes from `SOURCE_COMMIT` (`AIDEV_COMMIT_SHA` or git) |

| Slot | Steps |
|---|---|
| quick | lint, unit |
| full, canary | lint, unit, build |
| static | lint |
| baseline | unit |
| coverage | coverage |
| system | build |

Not bound: `yarn checktranslations` (it fails on `develop` today: unused keys in every
locale), and there is no e2e or server test suite.

## The test runtime image (`runtime/`)

The suites run in a container with `--network none` and your uid. It carries Node 18.14.0
and its bundled yarn 1.22.19 (the `node:18.14.0` image CI and the Dockerfile use) and a
yarn cache filled from `yarn.lock`, git dependencies included. `yarn-deps.sh` installs
`node_modules` offline from it.

When `yarn.lock`, `package.json` or `runtime/Dockerfile` change, rebuild and re-pin **in
the same commit**:

```bash
.aidev/runtime/build.sh --push   # put the printed repo@sha256:<digest> in project.yaml environment.image
```
