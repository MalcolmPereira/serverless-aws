#! /bin/zsh

#Start SAM Local on the same network so it can reference the localstack endpoint
#configured in the env.json
sam local start-api --docker-network bridge --env-vars env.json