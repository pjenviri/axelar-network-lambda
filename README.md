# Axelar Network Dashboard - Lambda functions
This project retrieve, normalize, process, aggregate and manage for [Axelar Network Dashboard Website](https://axelar-testnet.coinhippo.io) by interact with `Tendermint RPC`, `Cosmos SDK`, `Axelard`, `Prometheus` and `axelar-core logs`.
<br>
Using Amazon services ([AWS Lambda](https://aws.amazon.com/lambda), [AWS API Gateway](https://aws.amazon.com/api-gateway), [AWS EventBridge](https://aws.amazon.com/eventbridge), [Amazon OpenSearch Service](https://aws.amazon.com/opensearch-service), ...) to become serverless services for [Axelar Network Dashboard](https://github.com/nrsirapop/axelar-network-dashboard).

## Functions
- [requester](/requester) - A function for request the data from `Tendermint RPC`, `Cosmos SDK`, `Axelard` and `Prometheus`. (using [AWS API Gateway](https://aws.amazon.com/api-gateway) as a trigger)
- [opensearcher](/opensearcher) - A function for interact with indexer of blocks, transactions, uptimes, axelard cache, keygen participations, sign attempts, and etc. (using [Amazon OpenSearch Service](https://aws.amazon.com/opensearch-service) as a indexer)
- [archiver](/archiver) - A function for archive data from indexers. (using [AWS EventBridge](https://aws.amazon.com/eventbridge)
- [executor](/executor) - A function for execute `axelard` on `axelar-core` docker. (using [nodejs](https://nodejs.org/) as a service run on query nodes)
- [query-node](/query-node) - Script & config files for running `axelar-core` docker and `prometheus`.
- [subscriber](/subscriber) - Service for subscribe data from `Tendermint RPC` and `Prometheus`. (using [nodejs](https://nodejs.org/) as a service run on query nodes)
  - [blocks](/subscriber/blocks) - subscribe block data from `Tendermint RPC` for indexer `blocks` and `uptimes`.
  - [txs](/subscriber/txs) - subscribe transaction data from `Tendermint RPC` for indexer `transactions`.
  - [logs](/subscriber/logs) - subscribe `axelar-core` logs for threshold and participations data.

## Architecture Design

## Follow us
- [Website](https://coinhippo.io)
- [Twitter](https://twitter.com/coinhippoHQ)
- [Telegram](https://t.me/CoinHippoChannel)