# Condenser - Claude Code Project Guide

## Project Overview

Condenser is the React.js web interface for Hive.blog, a blockchain-based social media platform powered by the Hive blockchain. It's a full-stack application combining server-side rendering (SSR) with Koa.js and client-side React rendering.

## Tech Stack

- **Frontend**: React 18.1, Redux 3.7 + redux-saga, Immutable.js
- **Server**: Koa.js 2.x (Node.js SSR)
- **Styling**: SCSS, Material-UI v5, Emotion (CSS-in-JS)
- **Blockchain**: @hiveio/hive-js, hive-auth-client, hivesigner
- **Build**: Webpack 5, Babel 7 (no TypeScript)
- **Testing**: Jest 29, @testing-library/react, Enzyme
- **Linting**: ESLint (Airbnb config), Prettier

## Directory Structure

```
src/
├── app/                    # React frontend application
│   ├── Main.js             # Client entry point (webpack entry)
│   ├── components/         # React components
│   │   ├── elements/       # Reusable UI elements
│   │   ├── cards/          # Card components
│   │   ├── modules/        # Feature modules
│   │   └── pages/          # Page components
│   ├── redux/              # Redux reducers and sagas
│   ├── utils/              # Utility functions
│   ├── locales/            # i18n translation files
│   └── assets/             # Stylesheets
├── server/                 # Koa.js server for SSR
│   ├── index.js            # Server entry point
│   └── api/                # Server API endpoints
├── shared/                 # Shared client/server code
│   └── api_client/         # Blockchain API client
└── hooks/                  # Custom React hooks

webpack/                    # Webpack configurations
config/                     # Environment configs (default.json, production.json)
```

## Development Commands

```bash
# Development
yarn start                  # Run dev server (~60s startup)
yarn debug                  # Dev with Node inspector

# Build & Production
yarn build                  # Build for production
yarn production             # Run production server

# Code Quality
yarn fmt                    # Format with Prettier
yarn eslint                 # Lint changed files
yarn eslint:fix             # Auto-fix lint issues
yarn test                   # Run Jest tests

# Docker
./run.sh start dev          # Start dev environment
./run.sh start prod         # Start production
./run.sh stop <env>         # Stop environment
```

## Key Files

- **Client Entry**: `src/app/Main.js`
- **Server Entry**: `src/server/index.js`
- **Config**: `config/default.json`, `config/custom-environment-variables.json`
- **Webpack**: `webpack/base.config.js`, `webpack/dev.config.js`, `webpack/prod.config.js`

## Coding Conventions

- **File Naming**: CamelCase for .js/.jsx files
- **CSS**: BEM methodology with SCSS (e.g., `Header`, `Header__menu-item`, `Header__menu-item--selected`)
- **Formatting**: 4-space indent, 120-char line width, single quotes, trailing commas (es5)
- **Components**: Functional components with hooks, redux-saga for side effects
- **Environment Variables**: Use `SDC_` prefix (e.g., `SDC_SESSION_SECRETKEY`)

## CI/CD Notes

**Stages**: test → build → deploy

**Jobs**:
- `run-unit-tests`: Jest with coverage
- `run-eslint`: Lint all src/
- `build-review-app`: Deploy MR preview
- `deploy-staging`: Deploy develop branch

**Protected Branch**: `develop` - requires MR with passing pipeline

**Review Apps**: Deployed to `review.*.condenser.engrave.dev` on MRs
