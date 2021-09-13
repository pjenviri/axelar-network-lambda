require('dotenv').config({path: __dirname + '/.env'});
const { exec } = require('child_process');

const WebSocket = require('ws');
const axios = require('axios');

const env = {
  rpc: {
    host: process.env.RPC_HOST || 'localhost:26657',
  },
  requester: {
    api_host: process.env.REQUESTER_API_HOST || '{YOUR_REQUESTER_API_HOST}',
  },
};

console.log(`ENV: ${JSON.stringify(env)}`);

const requester = axios.create({ baseURL: env.requester.api_host });

const connect = () => {
  const ws = new WebSocket(`ws://${env.rpc.host}/websocket`);

  ws.on('open', () => {
    console.log(`CONNECTED: ws://${env.rpc.host}/websocket`);

    ws.send('{"jsonrpc":"2.0","method":"subscribe","id":"0","params":{"query":"tm.event=\'NewBlock\'"}}');
  });

  ws.on('close', e => {
    console.log(`DISCONNECTED: ${e.reason}`);

    setTimeout(() => connect(), 1000);
  });

  ws.on('error', err => {
    console.log(`ERROR: ${err.message}`);

    ws.close();

    if (err.message && err.message.startsWith('connect ECONNREFUSED')) {
      exec('bash ~/blocks/startAxelarCore.sh');
    }
  });

  ws.on('message', async data => {
    try {
      data = JSON.parse(data.toString());

      if (data && data.result && data.result.data && data.result.data.value && data.result.data.value.block && data.result.data.value.block.header && data.result.data.value.block.header.height) {
        const height = data.result.data.value.block.header.height;

        console.log(`GET BLOCK: ${height}`);

        const res = await requester.get('', { params: { api_name: 'cosmos', path: `/cosmos/base/tendermint/v1beta1/blocks/${height}` } })
          .catch(error => { return { data: { error } }; });
      }
    } catch (err) {}
  });
}

connect();