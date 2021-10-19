#!/bin/bash

CORE_VERSION=$(curl -s https://raw.githubusercontent.com/axelarnetwork/axelarate-community/main/documentation/docs/testnet-releases.md | grep axelar-core | cut -d \` -f 4)
echo ${CORE_VERSION}

cd ~/axelarate-community

join/join-testnet.sh --axelar-core ${CORE_VERSION}
