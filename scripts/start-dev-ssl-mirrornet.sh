#!/usr/bin/env bash

#
# Start local dev server with SSL support (configure traefik or nginx to
# handle your local domain).
#

export SDC_CLIENT_STEEMD_URL=https://hive-5.pl.syncad.com
export SDC_SERVER_STEEMD_URL=https://hive-5.pl.syncad.com
export SDC_CHAIN_ID="4200000000000000000000000000000000000000000000000000000000000000"
export SDC_DANGEROUSLY_ALLOW_LOGIN_WITH_OBER_KEY=true

ROCKET_CHAT_URI="${1:-https://rocket-chat.local.wet.ovh}"

./scripts/start-dev-ssl.sh

# export SDC_OPENHIVE_CHAT_API_URI="${ROCKET_CHAT_URI}" ;
# export SDC_OPENHIVE_CHAT_URI="${ROCKET_CHAT_URI}" ;
# export SDC_OAUTH_SERVER_ENABLE="yes" ;
# export SDC_OAUTH_SERVER_CLIENTS="`cat config/oauth-server-clients-development-ssl.json \
#         | sed \"s|https://rocket-chat.local.wet.ovh|${ROCKET_CHAT_URI}|\"`" ;

# export SDC_OPENHIVE_CHAT_IFRAME_INTEGRATION_ENABLE="yes" ;
# export SDC_OPENHIVE_CHAT_IFRAME_VISIBLE="yes" ;
# export SDC_OPENHIVE_CHAT_IFRAME_CREATE_USERS="no" ;

# exec yarn start
