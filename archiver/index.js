/************************************************
 * This code is a function for archive data from opensearch APIs.
 * Deploy on AWS Lambda (triggered by AWS EventBridge)
 ************************************************/
exports.handler = async (event, context, callback) => {
  // import module for submitting request.
  const axios = require('axios');

  /************************************************
   * Internal API information for requesting data
   * You can setup these environment variables below on the AWS Lambda function's configuration.
   ************************************************/
  const env = {
    requester: {
      api_host: process.env.REQUESTER_API_HOST || '{YOUR_REQUESTER_API_HOST}',
    },
    opensearcher: {
      api_host: process.env.OPENSEARCHER_API_HOST || '{YOUR_OPENSEARCHER_API_HOST}',
    },
  };

  const indexes = [{ index: 'txs', must_not: { exists: { field: 'keygen' } } }, { index: 'blocks' }, { index: 'uptimes' }];

  const max_stored_block_size = 100000;

  // response data variable
  let response = null;

  // initial requester object
  const requester = axios.create({ baseURL: env.requester.api_host });

  const opensearcher = axios.create({ baseURL: env.opensearcher.api_host });

  // initial response object
  let res = null;

  // send request
  res = await requester.get('', { params: { api_name: 'rpc', path: '/status' } })
    // set response data from error handled by exception
    .catch(error => { return { data: { results: null, error } }; });

  const latestBlock = res && res.data && Number(res.data.latest_block_height);

  if (typeof latestBlock === 'number' && latestBlock > max_stored_block_size) {
    for (let i = 0; i < indexes.length; i++) {
      const indexObject = indexes[i];
      const { index, must_not } = { ...indexObject };

      // send request
      res = await opensearcher.post('', { path: `/${index}/_delete_by_query`, query: JSON.stringify({ bool: { must: { range: { height: { lt: latestBlock - max_stored_block_size } } }, must_not: must_not ? { ...must_not } : undefined } }), index, method: 'search' })
        // set response data from error handled by exception
        .catch(error => { return { data: { error } }; });

      response = response || [];

      response.push(res && res.data);
    }
  }

  // return response data
  return response;
};