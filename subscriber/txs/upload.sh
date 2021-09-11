#!/bin/bash

if [ -z "$1" ]
then
	NETWORK="testnet"
else
	NETWORK=$1
fi

pkill -f "bash upload.sh"

PROJECT_PATH=~/Desktop/axelar/lambda/subscriber
PROJECT_DIR=txs
SERVER_USERNAME="root"
APP_NAME="txs"

if [ "${NETWORK}" == "testnet" ] || [ "${NETWORK}" == "mainnet" ]
then
	if [ "${NETWORK}" == "testnet" ]
	then
		SERVER_IP="128.199.147.16"
		echo "REQUESTER_API_HOST=https://godeeq5o09.execute-api.us-west-1.amazonaws.com/axelar-testnet" > ${PROJECT_PATH}/${PROJECT_DIR}/.env
	elif [ "${NETWORK}" == "mainnet" ]
	then
		SERVER_IP="128.199.147.16"
		echo "REQUESTER_API_HOST=https://godeeq5o09.execute-api.us-west-1.amazonaws.com/axelar-testnet" > ${PROJECT_PATH}/${PROJECT_DIR}/.env
	fi

	scp -r ${PROJECT_PATH}/${PROJECT_DIR} ${SERVER_USERNAME}@${SERVER_IP}:~/

	ssh ${SERVER_USERNAME}@${SERVER_IP} "pm2 delete ${APP_NAME}"
	ssh ${SERVER_USERNAME}@${SERVER_IP} "pm2 start /${SERVER_USERNAME}/${PROJECT_DIR}/index.js -n ${APP_NAME}"
	ssh ${SERVER_USERNAME}@${SERVER_IP} "pm2 save"
fi
