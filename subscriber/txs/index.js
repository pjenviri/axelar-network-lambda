require('dotenv').config({path: __dirname + '/.env'});

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

const ws = new WebSocket(`ws://${env.rpc.host}/websocket`);

ws.on('open', () => {
  console.log(`CONNECTED: ws://${env.rpc.host}/websocket`);

  ws.send('{"jsonrpc":"2.0","method":"subscribe","id":"0","params":{"query":"tm.event=\'Tx\'"}}');
});

ws.on('message', async data => {
  try {
    data = JSON.parse(data.toString());

    if (data && data.result && data.result.events && data.result.events['tx.hash']) {
      const txsHash = data.result.events['tx.hash'];

      for (let i = 0; i < txsHash.length; i++) {
        const tx = txsHash[i];

        console.log(`GET TX: ${tx}`);

        const res = await requester.get('', { params: { api_name: 'cosmos', path: `/cosmos/tx/v1beta1/txs/${tx}` } })
          .catch(error => { return { data: { error } }; });
      }
    }
  } catch (err) {}
});