#!/usr/bin/env bash

#
# Start local dev server with SSL support (configure traefik or nginx to
# handle your local domain).
#

ROCKET_CHAT_URI="${1:-https://rocket-chat.local.wet.ovh}"

export SDC_OPENHIVE_CHAT_API_URI="${ROCKET_CHAT_URI}" ;
export SDC_OPENHIVE_CHAT_URI="${ROCKET_CHAT_URI}" ;
export SDC_OAUTH_SERVER_ENABLE="yes" ;
export SDC_OAUTH_SERVER_CLIENTS="`cat config/oauth-server-clients-development-ssl.json`" ;

export SDC_OPENHIVE_CHAT_IFRAME_INTEGRATION_ENABLE="yes" ;
export SDC_OPENHIVE_CHAT_IFRAME_VISIBLE="yes" ;
export SDC_OPENHIVE_CHAT_IFRAME_CREATE_USERS="no" ;

exec yarn start
