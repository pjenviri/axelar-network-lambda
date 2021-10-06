require('dotenv').config({path: __dirname + '/.env'});

const moment = require('moment');
const axios = require('axios');

const env = {
  opensearcher: {
    api_host: process.env.OPENSEARCHER_API_HOST || '{YOUR_OPENSEARCHER_API_HOST}',
  },
  requester: {
    api_host: process.env.REQUESTER_API_HOST || '{YOUR_REQUESTER_API_HOST}',
  },
};

// function for synchronous sleep
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

console.log(`ENV: ${JSON.stringify(env)}`);

const opensearcher = axios.create({ baseURL: env.opensearcher.api_host });

const requester = axios.create({ baseURL: env.requester.api_host });

const stream = require('stream');
const Docker = require('dockerode');
const container = new Docker().getContainer('axelar-core');

const logStream = new stream.PassThrough();

let app_message;
let keygen;
let sign;

logStream.on('data', async chunk => {
  const data = chunk.toString('utf8').replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '').trim();

  if (data.includes('app_message')) {
    const attributes = [
      {
        id: 'data0',
        pattern_start: '',
        pattern_end: null,
      },
    ];

    app_message = mergeData(data, attributes, {});
  }
  else if (data.includes('","node_id":"')) {
    const attributes = [
      {
        id: 'data1',
        pattern_start: '',
        pattern_end: null,
      },
    ];

    app_message = mergeData(data, attributes, app_message);

    if (app_message && app_message.data0 && app_message.data1) {
      try {
        console.log('EVENT: app_message');

        await saving({ ...(JSON.parse(`${app_message.data0}${app_message.data1}`).app_message), id: 'app_message' }, 'constants');

        app_message = {};
      } catch (error) {}
    }
  }
  else if (data.includes('scheduling signing for sig ID')) {
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
        pattern_end: ' (currently',
        type: 'number',
      },
    ];

    console.log('EVENT: scheduling signing');

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
      {
        id: 'result',
        hard_value: true,
      },
    ];

    console.log('EVENT: attempted to start signing');

    sign = mergeData(data, attributes);

    if (sign && sign.non_participants) {
      sign.non_participants = sign.non_participants.filter(address => address).map(address => {
        const pattern_start = 'operator_address: ';
        const pattern_end = 'consensus_pubkey:';
        const from = pattern_start ? address.indexOf(pattern_start) + pattern_start.length : 0;
        const to = typeof pattern_end === 'string' && address.indexOf(pattern_end) > -1 ? address.indexOf(pattern_end) : address.length;

        address = address.substring(from, to).trim();

        return address;
      });
    }

    await saving(sign, 'sign_attempts', true, 1);
  }
  else if (sign && sign.sig_id && data.includes('error starting signing:')) {
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
        hard_value: sign.sig_id,
      },
      {
        id: 'reason',
        pattern_start: 'error starting signing: ',
        pattern_end: ' module=',
      },
      {
        id: 'result',
        hard_value: false,
      },
    ];

    sign = null;

    console.log('EVENT: error starting signing');

    await saving(mergeData(data, attributes), 'sign_attempts', true, 2);
  }
  else if (data.includes('keygen for key ID')) {
    const attributes = [
      {
        id: 'timestamp',
        pattern_start: '',
        pattern_end: ' ',
        type: 'date',
      },
      {
        id: 'key_id',
        pattern_start: `key ID '`,
        pattern_end: `' scheduled`,
      },
      {
        id: 'height',
        pattern_start: 'for block ',
        pattern_end: ' (currently',
        type: 'number',
      },
    ];

    console.log('EVENT: keygen for key ID');

    keygen = mergeData(data, attributes, {});
  }
  else if (keygen && keygen.key_id && keygen.height) {
    if (data.includes('processing') && data.includes(` keygens at height ${keygen.height} `)) {
      keygen.processing = true;
    }
    else if (keygen.processing && data.includes('linking available operations to snapshot #')) {
      const attributes = [
        {
          id: 'snapshot',
          pattern_start: 'snapshot #',
          pattern_end: ' module=',
          type: 'number',
        },
      ];

      keygen = mergeData(data, attributes, keygen);
    }
    else if (data.includes('error starting keygen:')) {
      const attributes = [
        {
          id: 'timestamp',
          pattern_start: '',
          pattern_end: ' ',
          type: 'date',
        },
        {
          id: 'reason',
          pattern_start: 'error starting keygen: ',
          pattern_end: ' module=',
        },
      ];

      keygen = mergeData(data, attributes, keygen);

      keygen.id = `${keygen.key_id}_${keygen.height}`;

      console.log('EVENT: error starting keygen');

      await saving(keygen, 'failed_keygens');

      keygen = {};
    }
  }
});

const mergeData = (_data, attributes, initialData) => {
  const data = initialData || {};

  if (_data && attributes) {
    attributes.forEach(attribute => {
      try {
        const from = attribute.pattern_start ? _data.indexOf(attribute.pattern_start) + attribute.pattern_start.length : 0;
        const to = typeof attribute.pattern_end === 'string' && _data.indexOf(attribute.pattern_end) > -1 ? _data.indexOf(attribute.pattern_end) : _data.length;

        if ('hard_value' in attribute) {
          data[attribute.id] = attribute.hard_value;
        }
        else {
          data[attribute.id] = _data.substring(from, to);
          data[attribute.id] = data[attribute.id].trim();
          data[attribute.id] = attribute.type === 'date' ?
            Number(moment(data[attribute.id]).format('X'))
            :
            attribute.type === 'number' ?
              Number(data[attribute.id])
              :
              attribute.type && attribute.type.startsWith('array') ?
                data[attribute.id].replace('[', '').replace(']', '').split(',').map(element => element && element.split('"').join('').split('\\n').join('').split('\\').join('').trim()).filter(element => element).map(element => attribute.type.includes('number') ? Number(element) : element)
                :
                attribute.type === 'json' ?
                  JSON.parse(data[attribute.id])
                  :
                  data[attribute.id];
        }

        if (attribute.primary_key) {
          data.id = data[attribute.id];
        }
      } catch (error) {}
    });
  }

  return data;
};

const saving = async (data, index, update, delaySecs) => {
  if (data && data.id && index) {
    if (typeof data.snapshot === 'number') {
      let res = await requester.get('', { params: { api_name: 'executor', path: '/', cmd: `axelard q snapshot info ${data.snapshot}` } })
        .catch(error => { return { data: { error } }; });

      if (res && res.data && res.data.data && !res.data.data.stdout && res.data.data.stderr && moment().diff(moment(data.timestamp * 1000), 'day') <= 1) {
        res = await requester.get('', { params: { api_name: 'executor', path: '/', cmd: `axelard q snapshot info latest` } })
          .catch(error => { return { data: { error } }; });
      }

      if (res && res.data && res.data.data && res.data.data.stdout) {
        try {
          data.snapshot_validators = JSON.parse(res.data.data.stdout.split('\\n').join('').split('  ').join(' '));
        } catch (error) {}
      }

      if (data.snapshot_validators && data.snapshot_validators.validators) {
        res = await requester.get('', { params: { api_name: 'executor', path: '/', cmd: `axelard q staking validators -oj` } })
          .catch(error => { return { data: { error } }; });

        if (res && res.data && res.data.data && res.data.data.stdout) {
          try {
            let validators = JSON.parse(res.data.data.stdout).validators;
            validators = validators.filter(validator => data.snapshot_validators.validators.findIndex(_validator => _validator.validator === validator.operator_address) < 0).map(validator => { return { ...validator, validator: validator.operator_address } });

            data.snapshot_non_participant_validators = { validators };
          } catch (error) {}
        }
      }
    }

    if ((data.participants && data.participants.length > 0) && !(data.non_participants && data.non_participants.length > 0)) {
      const res = await requester.get('', { params: { api_name: 'executor', path: '/', cmd: `axelard q staking validators -oj` } })
        .catch(error => { return { data: { error } }; });

      if (res && res.data && res.data.data && res.data.data.stdout) {
        try {
          let validators = JSON.parse(res.data.data.stdout).validators;
          validators = validators.filter(validator => data.participants.findIndex(_validator => _validator === validator.operator_address) < 0).map(validator => validator.operator_address);

          data.non_participants = validators;
        } catch (error) {}
      }
    }

    if (update) {
      await sleep((typeof delaySecs === 'number' ? delaySecs : 2) * 1000);
    }

    console.log(`INDEXING: ${data.id} to /${index}`);

    // send request
    await opensearcher.post('', { ...data, index, method: 'update', id: data.id, path: update ? `/${index}/_update/${data.id}` : undefined })
      // set response data from error handled by exception
      .catch(error => { return { data: { error } }; });
  }
};

const indexing = async (_data, attributes, index, update, delaySecs) => {
  if (_data && attributes) {
    const data = mergeData(_data, attributes);

    const primary_key = attributes.find(attribute => attribute.primary_key);

    if (index && primary_key && data[primary_key.id]) {
      if (update) {
        await sleep((typeof delaySecs === 'number' ? delaySecs : 2) * 1000);
      }

      console.log(`INDEXING ${primary_key.id}: ${data[primary_key.id]}${data.participants ? ` /(${data.participants.length})` : ''}${data.non_participants ? ` X(${data.non_participants.length})` : ''} to /${index}`);

      // send request
      await opensearcher.post('', { ...data, index, method: 'update', id: data[primary_key.id], path: update ? `/${index}/_update/${data[primary_key.id]}` : undefined })
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