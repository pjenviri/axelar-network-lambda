require('dotenv').config({path: __dirname + '/.env'});

const moment = require('moment');
const axios = require('axios');

const env = {
  opensearcher: {
    api_host: process.env.OPENSEARCHER_API_HOST || '{YOUR_OPENSEARCHER_API_HOST}',
  },
};

console.log(`ENV: ${JSON.stringify(env)}`);

const opensearcher = axios.create({ baseURL: env.opensearcher.api_host });

const stream = require('stream');
const Docker = require('dockerode');
const container = new Docker().getContainer('axelar-core');

const logStream = new stream.PassThrough();

logStream.on('data', async chunk => {
  const data = chunk.toString('utf8').replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim();

  if (data.includes('scheduling signing for sig ID')) {
    const attributes = [
      {
        id: 'timestamp',
        pattern_start: '',
        pattern_end: ' ',
        type: 'date',
      },
      {
        id: 'sig_id',
        primary_key: true,
        pattern_start: `sig ID '`,
        pattern_end: `' and`,
      },
      {
        id: 'key_id',
        pattern_start: `key ID '`,
        pattern_end: `' at`,
      },
      {
        id: 'height',
        pattern_start: 'at block ',
        pattern_end: ` (currently`,
        type: 'number',
      },
    ];

    console.log('scheduling signing')

    await indexing(data, attributes, 'sign_attempts');
  }
  else if (data.includes('Attempted to start signing sigID')) {
    const attributes = [
      {
        id: 'timestamp',
        pattern_start: '',
        pattern_end: ' ',
        type: 'date',
      },
      {
        id: 'sig_id',
        primary_key: true,
        pattern_start: 'sigID ',
        pattern_end: ' didStart=',
      },
      {
        id: 'non_participant_shares',
        pattern_start: 'nonParticipantShareCounts=',
        pattern_end: ' nonParticipants=',
        type: 'array_number',
      },
      {
        id: 'non_participants',
        pattern_start: 'nonParticipants=',
        pattern_end: ' participantShareCounts=',
        type: 'array',
      },
      {
        id: 'participant_shares',
        pattern_start: 'participantShareCounts=',
        pattern_end: ' participants=',
        type: 'array_number',
      },
      {
        id: 'participants',
        pattern_start: 'participants=',
        pattern_end: ' sigID=',
        type: 'array',
      },
    ];

    console.log('attempted to start signing')

    await indexing(data, attributes, 'sign_attempts');
  }
});

const indexing = async (_data, attributes, index) => {
  if (_data && attributes) {
    const data = {};

    attributes.forEach(attribute => {
      const from = _data.indexOf(attribute.pattern_start) + attribute.pattern_start.length;
      const to = _data.indexOf(attribute.pattern_end) > -1 ? _data.indexOf(attribute.pattern_end) : _data.length;

      data[attribute.id] = _data.substring(from, to);
      data[attribute.id] = data[attribute.id].trim();
      data[attribute.id] = attribute.type === 'date' ?
        Number(moment(data[attribute.id]).format('X'))
        :
        attribute.type === 'number' ?
          Number(data[attribute.id])
          :
          attribute.type && attribute.type.startsWith('array') ?
            data[attribute.id].replace('[', '').replace(']', '').split(',').map(element => element && element.split('"').join('').split('\\').join('').trim()).filter(element => element).map(element => attribute.type.includes('number') ? Number(element) : element)
            :
            data[attribute.id];
    });

    const primary_key = attributes.find(attribute => attribute.primary_key);

    if (index && primary_key && data[primary_key.id]) {
      console.log(`SAVE ${primary_key.id}: ${data[primary_key.id]} to /${index}`)

      // send request
      await opensearcher.post('', { ...data, index, method: 'update', id: data[primary_key.id] })
        // set response data from error handled by exception
        .catch(error => { return { data: { error } }; });
    }
  }
};

const connect = () => {
  container.logs({ follow: true, stdout: true, stderr: true, since: moment().subtract(1, 'days').unix() }, (err, stream) => {
    if (err) return;

    container.modem.demuxStream(stream, logStream, logStream);

    stream.on('end', () => {});
  });
}

connect();