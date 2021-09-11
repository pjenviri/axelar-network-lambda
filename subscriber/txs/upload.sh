#!/bin/bash

PROJECT_PATH=~/Desktop/axelar/lambda/subscriber
PROJECT_DIR=txs
SERVER_USERNAME="root"
SERVER_IP="128.199.147.16"
APP_NAME="txs"

pkill -f "bash upload.sh"

scp -r ${PROJECT_PATH}/${PROJECT_DIR} ${SERVER_USERNAME}@${SERVER_IP}:~/

ssh ${SERVER_USERNAME}@${SERVER_IP} "pm2 delete ${APP_NAME}"
ssh ${SERVER_USERNAME}@${SERVER_IP} "pm2 start /${SERVER_USERNAME}/${PROJECT_DIR}/index.js -n ${APP_NAME}"
ssh ${SERVER_USERNAME}@${SERVER_IP} "pm2 save"
