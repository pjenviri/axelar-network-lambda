#!/bin/bash
if [ -z "$1" ]
then
	NETWORK="testnet"
else
	NETWORK=$1
fi

LAMBDA_FUNC_NAME=axelar-archiver-${NETWORK}
PROJECT_PATH=~/Desktop/axelar/lambda/archiver

cd ${PROJECT_PATH}
zip -r ${LAMBDA_FUNC_NAME}.zip .
aws lambda update-function-code --function-name ${LAMBDA_FUNC_NAME} --zip-file fileb://${PROJECT_PATH}/${LAMBDA_FUNC_NAME}.zip --region us-west-1
rm ${LAMBDA_FUNC_NAME}.zip
