/************************************************
 * This code is a function for request data from APIs.
 * Deploy on AWS Lambda (triggered by AWS API Gateway)
 ************************************************/
exports.handler = async (event, context, callback) => {
  // import module for submitting request.
  const axios = require('axios');

  // import modules
  const _ = require('lodash');

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

    // initial response object
    let res = null;

    // initial path parameter
    let path = event.queryStringParameters.path;
    // remove path parameter (if exist) before setup query string parameters
    if (path) {
      delete event.queryStringParameters.path;
    }

    // generate url string
    const generateUrl = (url, params, paramsFilterOut) => {
      url = url || '/';

      return [url, Object.entries({ ...params }).filter(([param, value]) => !(paramsFilterOut && paramsFilterOut.includes(param))).map(entry => entry.join('=')).join('&')].filter(urlPart => urlPart).join('?');
    };

    // initial params parameter
    let params = null;

    // seperate each api
    switch (apiName) {
      case 'rpc':
        // normalize path parameter
        path = path || '';
        // setup query string parameters including API key
        params = { ...event.queryStringParameters };

        // send request
        res = await requester.get(path, { params })
          // set response data from error handled by exception
          .catch(error => { return { data: { results: null, error } }; });
        break;
      case 'cosmos':
        // normalize path parameter
        path = path || '';
        // setup query string parameters including API key
        params = { ...event.queryStringParameters };

        // send request
        res = await requester.get(path, { params })
          // set response data from error handled by exception
          .catch(error => { return { data: { error } }; });
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