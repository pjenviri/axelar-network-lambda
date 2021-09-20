require('dotenv').config({path: __dirname + '/.env'});
const express = require('express');
const bodyParser = require('body-parser');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

const app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const execute = async (req, res) => {
  console.log(`RECV COMMAND: ${req.query && JSON.stringify(req.query)}`);

  let data;

  if (req.query && req.query.cmd && req.query.cmd.startsWith('axelard q ')) {
    const execCommand = `docker exec -i axelar-core ${req.query.cmd}`;

    console.log(`EXEC COMMAND: ${execCommand}`);

    data = await exec(execCommand);
  }
  else {
    data = { error: 'command not found' };
  }

  try {
    console.log(`SEND RESPONSE: ${JSON.stringify(data)}`);
  } catch (error) {}

  res.send({ data });
};

app.get('/', (req, res) => execute(req, res));

const port = process.env.PORT || 3333;

console.log(`START SERVICE: on port ${port}`);

app.listen(port);