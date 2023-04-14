
# Condenser

Condenser is the react.js web interface to the
blockchain-based social media platform, Hive.blog.  It uses a
[Hive compatible blockchain](https://gitlab.syncad.com/hive/hive), powered by DPoS Governance and ChainBase DB to store JSON-based content for a plethora of web
applications.

## Why would I want to use Condenser?

* Learning how to build blockchain-based web applications using Hive compatible blockchain as a content storage mechanism in react.js
* Reviewing the inner workings of the Hive.blog social media platform
* Assisting with software development for Hive.blog and Hive.io

## Installation

#### Docker

If you would like to modify, build, and run condenser using docker, it's as
simple as pulling in the github repo and issuing one command to build it,
like this:

```bash
git clone https://gitlab.syncad.com/hive/condenser
cd condenser
./run.sh start dev
```

To build developer image manually, you can use:

`docker build --target development --tag condenser:dev .`

#### Docker Compose

If you like to run and build condenser and additionally a reverse-proxy using an Nginx Docker image, with companion Letsencrypt (SSL) support, you can simple launch the Docker-compose files via the included `run.sh`-scripts.

```bash
git clone https://gitlab.syncad.com/hive/condenser
cd condenser
./run.sh start proxy            # to start the nginx reverse proxy (with ssl support)
./run.sh start (prod|dev|stg)   # to build and start the condensor image
./run.sh logs (prod|dev|stg)    # (optionally) to attach to the condensor image and inspect its logs
```

## Building from source without docker (the 'traditional' way):
(better if you're planning to do condenser development)

#### Clone the repository and make a tmp folder

```bash
git clone https://gitlab.syncad.com/hive/condenser
cd condenser
mkdir tmp
```

#### Install dependencies

Install at least Node.js v12 if you don't already have it.

Condenser is known to successfully build using node 12.6, npm 6.13.4, and
yarn 1.22.4.

We use the yarn package manager instead of the default `npm`. There are
multiple reasons for this, one being that we have `hive-js` built from
source pulling the gitlab repo as part of the build process and yarn
supports this. This way the library that handles keys can be loaded by
commit hash instead of a version name and cryptographically verified to be
exactly what we expect it to be. Yarn can be installed with `npm`, but
afterwards you will not need to use `npm` further.

```bash
npm install -g yarn
yarn add babel-cli
yarn install --frozen-lockfile --ignore-optional
yarn run build
```
To run condenser in production mode, run:

```bash
yarn run production
```

When launching condenser in production mode it will automatically use 1
process per available core. You will be able to access the front-end at
http://localhost:8080 by default.

To run condenser in development mode, run:

```bash
yarn run start
```

It will take quite a bit longer to start in this mode (~60s) as it needs to
build and start the webpack-dev-server.

By default you will be connected to community public api node at
`https://api.hive.blog`. This is actually on the real blockchain and
you would use your regular account name and credentials to login - there is
not an official separate testnet at this time. If you intend to run a
full-fledged site relying on your own, we recommend looking into running a
copy of `hive (steemd)` locally instead
[https://gitlab.syncad.com/hive/hive](https://gitlab.syncad.com/hive/hive).

#### Debugging SSR code

`yarn debug` will build a development version of the codebase and then start the
local server with `--inspect-brk` so that you can connect a debugging client.
You can use Chromium to connect by finding the remote client at
`chrome://inspect/#devices`.

#### Configuration

The intention is to configure condenser using environment variables. You
can see the names of all of the available configuration environment
variables in `config/custom-environment-variables.json`. Default values are
stored in `config/defaults.json`.

Environment variables using an example like this:

```bash
export SDC_CLIENT_STEEMD_URL="https://api.hive.blog"
export SDC_SERVER_STEEMD_URL="https://api.hive.blog"
```

Keep in mind environment variables only exist in your active session, so if
you wish to save them for later use you can put them all in a file and
`source` them in.

If you'd like to statically configure condenser without variables you can
edit the settings directly in `config/production.json`. If you're running
in development mode, copy `config/production.json` to `config/dev.json`
with `cp config/production.json config/dev.json` and adjust settings in
`dev.json`.

If you're intending to run condenser in a production environment one
configuration option that you will definitely want to edit is
`server_session_secret` which can be set by the environment variable
`SDC_SESSION_SECRETKEY`. To generate a new value for this setting, you can
do this:

```bash
node
> crypto.randomBytes(32).toString('base64')
> .exit
```

## Style Guides For Submitting Pull Requests

### File naming and location

- Prefer CamelCase js and jsx file names
- Prefer lower case one word directory names
- Keep stylesheet files close to components
- Component's stylesheet file name should match component name

#### Js & Jsx

We use [prettier](https://github.com/prettier/prettier) to autofromat the
code, with [this configuration](.prettierrc). Run `yarn run fmt` to format
everything in `src/`, or `yarn exec -- prettier --config .prettierrc
--write src/whatever/file.js` for a specific file.

#### CSS & SCSS

If a component requires a css rule, please use its uppercase name for the
class, e.g. "Header" class for the header's root div.  We adhere to BEM
methodology with exception for Foundation classes, here is an example for
the Header component:

```html
<!-- Block -->
<ul class="Header">
  ...
  <!-- Element -->
  <li class="Header__menu-item">Menu Item 1</li>
  <!-- Element with modifier -->
  <li class="Header__menu-item--selected">Element with modifier</li>
</ul>
```

## Storybook

`yarn run storybook`

## Testing

### Run test suite

`yarn test`

will run `jest`

### Test endpoints offline

If you want to test a server-side rendered page without using the network, do this:

```
yarn build
OFFLINE_SSR_TEST=true NODE_ENV=production node --prof lib/server/index.js
```

This will read data from the blobs in `api_mockdata` directory. If you want to use another set of mock data, create a similar directory to that one and add an argument `OFFLINE_SSR_TEST_DATA_DIR` pointing to your new directory.

## Issues

To report a non-critical issue, please file an issue on this GitHub project.

If you find a security issue please report details to trusted community members.

We will evaluate the risk and make a patch available before filing the issue.

## Condenser's Oauth Server

We implemented a simple Oauth 2.0 server for authorizing Hive users in
our forked [Rocket
Chat](https://github.com/openhive-network/Rocket.Chat). This Oauth
server is disabled by default. To enable it, set environment variable
`SDC_OAUTH_SERVER_ENABLE` to `yes`, when starting Condenser. Server
authorizes users logged in via passing username and password or logged
in via hivesigner. Only these login methods are available at login page,
when we are in Oauth flow. When user is already logged in via other
method, e.g. hiveauth or keychain, Condenser displays a page telling
that user should logout and try again.

### Test login to Rocket Chat via Condenser's Oauth Server on local development host

Run our forked [Rocket
Chat](https://github.com/openhive-network/Rocket.Chat) instance on
http://localhost:3000. Do this in branch from
[PR1](https://github.com/openhive-network/Rocket.Chat/pull/1). Setup a
new Oauth client using page http://localhost:3000/admin/settings/OAuth. You
can see how my client is configured below:
```bash
syncad@dev-66:~/src/condenser$ curl -H "X-Auth-Token: ${ROCKET_CHAT_LOCAL_TOKEN}" -H "X-User-Id: ${ROCKET_CHAT_LOCAL_USER_ID}" http://localhost:3000/api/v1/settings.oauth
{
  "services": [
    {
      "_id": "8JFqgmogbfbiFKtcA",
      "service": "hiveblog",
      "accessTokenParam": "access_token",
      "authorizePath": "/oauth/authorize",
      "avatarField": "picture",
      "buttonColor": "#1d74f5",
      "buttonLabelColor": "#FFFFFF",
      "buttonLabelText": "Login with Hiveblog",
      "channelsAdmin": "rocket.cat",
      "channelsMap": "{\n\t\"rocket-admin\": \"admin\",\n\t\"tech-support\": \"support\"\n}",
      "clientId": "openhive_chat",
      "custom": true,
      "emailField": "",
      "groupsClaim": "groups",
      "identityPath": "/oauth/userinfo",
      "identityTokenSentVia": "default",
      "keyField": "username",
      "loginStyle": "redirect",
      "mapChannels": false,
      "mergeRoles": false,
      "mergeUsers": true,
      "nameField": "",
      "rolesClaim": "roles",
      "rolesToSync": "",
      "scope": "openid profile",
      "serverURL": "http://localhost:8080",
      "showButton": true,
      "tokenPath": "/oauth/token",
      "tokenSentVia": "header",
      "usernameField": "username"
    }
  ],
  "success": true
(syncad) syncad@dev-66:~/src/condenser$
```

Set environment variables for Oauth Server in another terminal:
```bash
export SDC_OPENHIVE_CHAT_API_URI="http://localhost:3000" ;
export SDC_OPENHIVE_CHAT_URI="http://localhost:3000" ;
export SDC_OAUTH_SERVER_ENABLE="yes" ;
export SDC_OAUTH_SERVER_CLIENTS="`cat config/oauth-server-clients-development.json`" ;
```
Start Condenser in the same terminal:
```bash
yarn start
```

#### Login to Rocket Chat via Condenser's Oauth Server on production host

Do something similar as in section above, but edit file
`config/oauth-server-clients-development.json` according to your needs.
It's very important to set hard to guess secret for Oauth client in
Condenser. Set the same secret in Rocket Chat Oauth client's config.

## Integration with Rocket Chat via iframe

Create following environment variable:
```bash
export CREATE_TOKENS_FOR_USERS="true" ;
```
Start Rocket Chat.

Activate the Iframe Integration in Rocket Chat instance – follow [guide
"Part I: Activate the Iframe
Integration"](https://developer.rocket.chat/rocket.chat/iframe-integration/adding-a-rocket.chat-chat-room-to-your-web-app#part-i-activate-the-iframe-integration).
On development machine set `http://localhost:8080/chat/parking` for
"Iframe URL", and `http://localhost:8080/chat/sso` for "API URL". Go to
Administration > Settings > General > Iframe Integration and check
"Enable Send" and "Enable Receive".

Create Personal Access Token for an admin account in Rocket Chat
(http://localhost:3000/account/tokens) for use in step below. Hit
"Ignore Two Factor Authentication" upon creation.

**TODO** We should give the lowest possible privileges to that token.
Maybe create a new, custom role in Rocket Chat.

Create following environment variables:
```bash
export SDC_OPENHIVE_CHAT_API_URI="http://localhost:3000" ;
export SDC_OPENHIVE_CHAT_URI="http://localhost:3000" ;
export SDC_OPENHIVE_CHAT_IFRAME_INTEGRATION_ENABLE="yes" ;
export SDC_OPENHIVE_CHAT_IFRAME_VISIBLE="yes" ;
export SDC_OPENHIVE_CHAT_IFRAME_CREATE_USERS="no" ;
export SDC_OPENHIVE_CHAT_ADMIN_USER_ID="<your-admin-user-id>" ;
export SDC_OPENHIVE_CHAT_ADMIN_USER_TOKEN="<your-admin-user-token>" ;
```
Variable `SDC_OPENHIVE_CHAT_IFRAME_INTEGRATION_ENABLE` enables or
disables iframe integration. Variable `SDC_OPENHIVE_CHAT_IFRAME_VISIBLE`
shows or hides chat button and iframe (hidden iframe still operates in
background).

Start Condenser.


## Logger

We implemented `Logger` in `src/app/utils/Logger.js` file, for logging
to console or nowhere (suppress logging), used as a replacement for
standard console messaging. Use it this way:
```javascript
import { logger } from './Logger';
logger.info('my info');
logger.error('my error');
```
Then you should see message in console in development environment,
but not in production environment. This behavior depends on
following environment variables (showing default values):
```bash
SDC_LOGGER_OUTPUT="noop"
SDC_LOGGER_LOG_LEVEL="all"
SDC_LOGGER_ADMINS=""
```

Setting `SDC_LOGGER_OUTPUT="console"` enables logging to console.

You can set `SDC_LOGGER_LOG_LEVEL` to following log levels"
```
off
fatal
error
warn
info
debug
trace
all
```

When user is logged in and he is listed in `SDC_LOGGER_ADMINS` (should
be string with Hive usernames delimited with space), the aplication
allows him to see all Logger messages on all log levels, regardless of
anything else, so also on production.
