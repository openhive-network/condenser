#!/bin/bash

function start {
    case "$1" in
        "proxy")
            docker-compose -f docker-compose.proxy.yml up --detach
        ;;

        "prod")
            docker-compose -f docker-compose.prod.yml up --detach
        ;;

        "stg")
            docker-compose -f docker-compose.staging.yml up --detach
        ;;

        "dev")
            docker-compose -f docker-compose.dev.yml up
        ;;

        "*")
            echo Unknown environment
            exit 1
        ;;
    esac
}

function stop {
    case "$1" in
        "proxy")
            docker-compose -f docker-compose.proxy.yml down
        ;;

        "prod")
            docker-compose -f docker-compose.prod.yml down
        ;;

        "stg")
            docker-compose -f docker-compose.staging.yml down
        ;;

        "dev")
            docker-compose -f docker-compose.dev.yml down
        ;;

        "*")
            echo Unknown environment
            exit 1
        ;;
    esac
}

function logs {
    case "$1" in
        "proxy")
            docker-compose -f docker-compose.proxy.yml logs --tail 30 --follow
        ;;

        "prod")
            docker-compose -f docker-compose.prod.yml logs --tail 30 --follow
        ;;

        "stg")
            docker-compose -f docker-compose.staging.yml logs --tail 30 --follow
        ;;

        "*")
            echo Unknown environment
            exit 1
        ;;
    esac
}


function build {
    case "$1" in
        "dev")
            docker-compose -f docker-compose.dev.yml up --force-recreate --build --no-cache --remove-orphans --detach
        ;;

        "prod")
            docker-compose -f docker-compose.prod.yml up --force-recreate --build --no-cache --remove-orphans --detach
        ;;

        "stg")
            docker-compose -f docker-compose.staging.yml up --force-recreate --build --remove-orphans --detach
        ;;

        "*")
            echo Unknown environment
            exit 1
        ;;
    esac
}

while test $# -gt 0; do
    case "$1" in
        "build")
            shift
            if test $# -gt 0; then
                build $1
            else
                echo "no environment specified"
                exit 1
            fi
            shift
        ;;

        "start")
            shift
            if test $# -gt 0; then
                start $1
            else
                echo "no environment specified"
                exit 1
            fi
            shift
        ;;

        "stop")
            shift
            if test $# -gt 0; then
                stop $1
            else
                echo "no environment specified"
                exit 1
            fi
            shift
        ;;

	"restart")
            shift
            if test $# -gt 0; then
                stop $1
		sleep 1
		start $1
            else
                echo "no environment specified"
                exit 1
            fi
            shift
        ;;

        "logs")
            shift
            if test $# -gt 0; then
                logs $1
            else
                echo "no environment specified"
                exit 1
            fi
            shift
        ;;

        *)
            echo "Usage: ./run.sh <start|stop|log> <prod|stg|dev>"
            exit 1
        ;;
    esac
done
