/************************************************
 * This code is a function for request data from APIs.
 * Deploy on AWS Lambda (triggered by AWS API Gateway)
 ************************************************/
exports.handler = async (event, context, callback) => {
  // import module for submitting request.
  const axios = require('axios');

  // import modules
  const _ = require('lodash');
  const moment = require('moment');

  // data
  const data = require('./data');

  // random
  const rand = (initial = 0, variation = 100) => initial + Math.ceil(Math.random(0, 1) * variation);

  // random host
  const randHost = (host, withIndex) => {
    host = host && host.split(',');

    const index = host ? rand(0, host.length) % host.length : -1;

    host = index > -1 ? host[index] : host;

    return withIndex && host ? [host, index] : host;
  };

  // number list
  const numbersList = numbers => (numbers && numbers.split(',').map(number => Number(number))) || [];

  /************************************************
   * Internal API information for requesting data
   * You can setup these environment variables below on the AWS Lambda function's configuration.
   ************************************************/
  const prometheus = randHost(process.env.PROMETHEUS_API_HOST, true);

  const env = {
    rpc: {
      api_host: randHost(process.env.RPC_API_HOST) || '{YOUR_RPC_API_HOST}',
    },
    cosmos: {
      api_host: randHost(process.env.COSMOS_API_HOST) || '{YOUR_COSMOS_API_HOST}',
    },
    executor: {
      api_host: randHost(process.env.EXECUTOR_API_HOST) || '{YOUR_EXECUTOR_API_HOST}',
    },
    prometheus: {
      api_host: (prometheus && prometheus[0]) || '{YOUR_PROMETHEUS_API_HOST}',
      threshold_time: prometheus && prometheus[0] && numbersList(process.env.PROMETHEUS_THRESHOLD_TIME)[prometheus[1]],
    },
    opensearcher: {
      api_host: process.env.OPENSEARCHER_API_HOST || '{YOUR_OPENSEARCHER_API_HOST}',
    },
    coingecko: {
      api_host: process.env.COINGECKO_API_HOST || 'https://api.coingecko.com/api/v3/',
    },
    data: {},
  };

  // response data variable
  let response = null;

  // check api_name parameter exist
  if (event.queryStringParameters && event.queryStringParameters.api_name && Object.keys(env).indexOf(event.queryStringParameters.api_name.trim().toLowerCase()) > -1) {
    // normalize api_name parameter
    const apiName = event.queryStringParameters.api_name.trim().toLowerCase();
    // remove api_name parameter before setup query string parameters
    delete event.queryStringParameters.api_name;

    // normalize cache parameter
    const cache = event.queryStringParameters.cache && event.queryStringParameters.cache.trim().toLowerCase() === 'true' ? true : false;
    // remove cache parameter before setup query string parameters
    delete event.queryStringParameters.cache;

    // initial requester object
    const requester = axios.create({ baseURL: env[apiName].api_host });

    const opensearcher = axios.create({ baseURL: env.opensearcher.api_host });

    // initial response object
    let res = null;

    // initial path parameter
    let path = event.queryStringParameters.path;
    // remove path parameter (if exist) before setup query string parameters
    if (path) {
      delete event.queryStringParameters.path;
    }

    // initial params parameter
    let params = null;

    // seperate each api
    switch (apiName) {
      case 'rpc':
        // normalize path parameter
        path = path || '';
        // setup query string parameters
        params = { ...event.queryStringParameters };

        // send request
        res = await requester.get(path, { params })
          // set response data from error handled by exception
          .catch(error => { return { data: { results: null, error } }; });

        if (path === '/status' && res && res.data && res.data.result) {
          res.data = res.data.result.sync_info;
        }
        else if (path === '/dump_consensus_state' && res && res.data && res.data.result) {
          res.data = res.data.result.round_state;
        }
        break;
      case 'cosmos':
        // normalize path parameter
        path = path || '';
        // setup query string parameters
        params = { ...event.queryStringParameters };

        // send request
        res = await requester.get(path, { params })
          // set response data from error handled by exception
          .catch(error => { return { data: { error } }; });

        if (path.startsWith('/cosmos/tx/v1beta1/txs/') && !path.endsWith('/') && res && res.data && res.data.tx_response && res.data.tx_response.txhash) {
          if (res.data.tx_response.logs && res.data.tx_response.logs.findIndex(log => log.events && log.events.findIndex(event => event.type === 'keygen') > -1) > -1) {
            const log = res.data.tx_response.logs[res.data.tx_response.logs.findIndex(log => log.events && log.events.findIndex(event => event.type === 'keygen') > -1)];
            const event = log.events[log.events.findIndex(event => event.type === 'keygen')];
            const sessionID = event.attributes && _.head(event.attributes.filter(attr => attr.key === 'sessionID').map(attr => attr.value));

            if (sessionID) {
              res.data.tx_response.keygen = sessionID;
            }
          }

          // send request
          await opensearcher.post('', { ...res.data.tx_response, index: 'txs', method: 'update', id: res.data.tx_response.txhash })
            // set response data from error handled by exception
            .catch(error => { return { data: { error } }; });
        }
        else if (path.startsWith('/cosmos/base/tendermint/v1beta1/blocks/') && !path.endsWith('/') && res && res.data && res.data.block && res.data.block.header && res.data.block.header.height) {
          // send request
          await opensearcher.post('', { ...res.data.block.header, hash: res.data.block_id && res.data.block_id.hash, txs: res.data.block.data && res.data.block.data.txs && res.data.block.data.txs.length, index: 'blocks', method: 'update', id: res.data.block.header.height })
            // set response data from error handled by exception
            .catch(error => { return { data: { error } }; });

          if (res.data.block.last_commit && res.data.block.last_commit.height && res.data.block.last_commit.signatures) {
            // send request
            await opensearcher.post('', { ...res.data.block.last_commit, height: Number(res.data.block.last_commit.height), validators: res.data.block.last_commit.signatures.map(signature => signature.validator_address), index: 'uptimes', method: 'update', id: res.data.block.last_commit.height })
              // set response data from error handled by exception
              .catch(error => { return { data: { error } }; });
          }
        }
        break;
      case 'executor':
        // normalize path parameter
        path = path || '';
        // setup query string parameters
        params = { ...event.queryStringParameters };

        let resCache;

        // get
        if (cache && params.cmd) {
          // send request
          resCache = await opensearcher.post('', { index: 'axelard', method: 'get', id: params.cmd })
            // set response data from error handled by exception
            .catch(error => { return { data: { error } }; });

          if (resCache.data && resCache.data._source && moment().diff(moment(resCache.data._source.updated_at * 1000), 'minutes', true) <= 5) {
            res = { data: { ...resCache.data._source } };
            break;
          }
        }

        // send request
        res = await requester.get(path, { params })
          // set response data from error handled by exception
          .catch(error => { return { data: { error } }; });

        if (res && res.data && res.data.data && res.data.data.stdout) {
          // update
          if (cache && params.cmd) {
            // send request
            await opensearcher.post('', { ...res.data, updated_at: moment().unix(), index: 'axelard', method: 'update', id: params.cmd })
              // set response data from error handled by exception
              .catch(error => { return { data: { error } }; });
          }
        }
        else if (resCache) {
          res = { data: { ...resCache.data._source } };
        }
        break;
      case 'prometheus':
        // normalize path parameter
        path = path || '/api/v1/query';
        // setup query string parameters
        params = { ...event.queryStringParameters };

        // send request
        res = await requester.get(path, { params })
          // set response data from error handled by exception
          .catch(error => { return { data: { status: 'error', error } }; });

        if (res && res.data && res.data.data && res.data.data.result && res.data.data.result.length < 1) {
          if (params.query && params.query.includes('_threshold') && env[apiName].threshold_time) {
            params = { ...params, time: env[apiName].threshold_time };

            // send request
            res = await requester.get(path, { params })
              // set response data from error handled by exception
              .catch(error => { return { data: { status: 'error', error } }; });
          }
        }
        break;
      case 'coingecko':
        // normalize path parameter
        path = path || '';
        // setup query string parameters
        params = { ...event.queryStringParameters };

        // send request
        res = await requester.get(path, { params })
          // set response data from error handled by exception
          .catch(error => { return { data: { error } }; });
        break;
      case 'data':
        res = { data: data[event.queryStringParameters.name] };
      default: // do nothing
    }

    // set response data
    if (res && res.data) {
      response = res.data;

      // remove error config
      if (response.error && response.error.config) {
        delete response.error.config;
      }
    }
  }

  // return response data
  return response;
};