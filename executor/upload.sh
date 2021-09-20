#!/bin/bash

if [ -z "$1" ]
then
  NETWORK="testnet"
else
  NETWORK=$1
fi

pkill -f "bash upload.sh"

PROJECT_PATH=~/Desktop/axelar/lambda
PROJECT_DIR=executor
SERVER_USERNAME="root"
APP_NAME="executor"

if [ "${NETWORK}" == "testnet" ] || [ "${NETWORK}" == "mainnet" ]
then
  if [ "${NETWORK}" == "testnet" ]
  then
    SERVER_IP="128.199.147.16"
    echo "PORT=3333" > ${PROJECT_PATH}/${PROJECT_DIR}/.env
  elif [ "${NETWORK}" == "mainnet" ]
  then
    SERVER_IP="128.199.147.16"
    echo "PORT=3333" > ${PROJECT_PATH}/${PROJECT_DIR}/.env
  fi

  scp -r ${PROJECT_PATH}/${PROJECT_DIR} ${SERVER_USERNAME}@${SERVER_IP}:~/

  ssh ${SERVER_USERNAME}@${SERVER_IP} "pm2 delete ${APP_NAME}"
  ssh ${SERVER_USERNAME}@${SERVER_IP} "pm2 start /${SERVER_USERNAME}/${PROJECT_DIR}/index.js -n ${APP_NAME}"
  ssh ${SERVER_USERNAME}@${SERVER_IP} "pm2 startup"
  ssh ${SERVER_USERNAME}@${SERVER_IP} "pm2 save"
fi
