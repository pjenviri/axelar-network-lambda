/************************************************
 * This code is a function for request data from APIs.
 * Deploy on AWS Lambda (triggered by AWS API Gateway)
 ************************************************/
exports.handler = async (event, context, callback) => {
  // import module for submitting request.
  const axios = require('axios');

  /************************************************
   * Internal API information for requesting data
   * You can setup these environment variables below on the AWS Lambda function's configuration.
   ************************************************/
  const env = {
    rpc: {
      api_host: process.env.RPC_API_HOST || '{YOUR_RPC_API_HOST}',
    },
    cosmos: {
      api_host: process.env.COSMOS_API_HOST || '{YOUR_COSMOS_API_HOST}',
    },
    opensearcher: {
      api_host: process.env.OPENSEARCHER_API_HOST || '{YOUR_OPENSEARCHER_API_HOST}',
    },
  };

  // response data variable
  let response = null;

  // check api_name parameter exist
  if (event.queryStringParameters && event.queryStringParameters.api_name && Object.keys(env).indexOf(event.queryStringParameters.api_name.trim().toLowerCase()) > -1) {
    // normalize api_name parameter
    const apiName = event.queryStringParameters.api_name.trim().toLowerCase();
    // remove api_name parameter before setup query string parameters
    delete event.queryStringParameters.api_name;

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
      default: // do nothing
    }

    // set response data
    if (res && res.data) {
      response = res.data;
    }
  }

  // return response data
  return response;
};