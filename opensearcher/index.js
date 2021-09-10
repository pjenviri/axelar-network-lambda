/************************************************
 * This code is a function for interact with Indexer.
 * Deploy on AWS Lambda (triggered by AWS API Gateway)
 ************************************************/
exports.handler = async (event, context, callback) => {
  // import module for submitting request.
  const axios = require('axios');

  /************************************************
   * Information for interact with Indexer
   * You can setup these environment variables below on the AWS Lambda function's configuration.
   ************************************************/
  const env = {
    api_host: process.env.OPENSEARCH_API_HOST || '{YOUR_OPENSEARCH_API_HOST}',
    username: process.env.OPENSEARCH_USERNAME || '{YOUR_OPENSEARCH_USERNAME}',
    password: process.env.OPENSEARCH_PASSWORD || '{YOUR_OPENSEARCH_PASSWORD}',
  };

  // response data variable
  let response = null;

  const body = (event.body && JSON.parse(event.body)) || event.queryStringParameters;

  if (body && body.index) {
    const _body = { ...body };

    // set table name
    const index = _body.index;
    delete body.index;
    // set method
    const method = _body.method; // search, get, update, delete
    delete body.method;
    // set id
    const id = _body.id;
    delete body.id;

    // initial requester object
    const requester = axios.create({ baseURL: env.api_host });

    const auth = {
      username: env.username,
      password: env.password,
    };

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

    // normalize path parameter
    path = path || '';

    // setup query string parameters
    params = { ...body };

    // do action
    switch(method) {
      case 'search':
        if (!path) {
          path = `${index}/_search`;
        }
        // send request
        res = await requester.post(path, body, { auth })
          // set response data from error handled by exception
          .catch(error => { return { data: { error } }; });
        break;
      case 'get':
        if (!path) {
          path = `${index}/${id}`;
        }
        // send request
        res = await requester.get(path, { params, auth })
          // set response data from error handled by exception
          .catch(error => { return { data: { error } }; });
        break;
      case 'update':
        if (!path) {
          path = `${index}/${id}`;
        }
        // send request
        res = await requester.post(path, body, { auth })
          // set response data from error handled by exception
          .catch(async error => {
            if (!path.endsWith('/_update')) {
              path = `${path}/_update`;
            }
            // send request
            return await requester.post(path, body, { auth })
              // set response data from error handled by exception
              .catch(error => { return { data: { error } }; });
          });
        break;
      case 'delete':
        if (!path) {
          path = `${index}/${id}`;
        }
        // send request
        res = await requester.delete(path, { params, auth })
          // set response data from error handled by exception
          .catch(error => { return { data: { error } }; });
        break;
      default:
        break;
    }

    // set response data
    if (res && res.data) {
      if (res.data.error) {
        delete res.data.error;
      }

      response = res.data;
    }
  }

  // return response data
  return response;
};