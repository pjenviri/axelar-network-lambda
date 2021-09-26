const bridge_accounts = [
  {
    id: 'btc',
    name: 'Bitcoin',
    image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    cmds: [
      'axelard q bitcoin consolidation-address --key-role master',
      'axelard q bitcoin consolidation-address --key-role secondary',
    ],
  },
  {
    id: 'eth',
    name: 'Ethereum',
    image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    cmds: [
      'axelard q evm gateway-address ethereum',
      'axelard q evm address ethereum --key-role master',
      'axelard q evm address ethereum --key-role secondary',
    ],
  },
  {
    id: 'sats',
    name: 'Satoshi',
    image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    cmds: [
      'axelard q evm token-address ethereum satoshi',
    ],
  },
  {
    id: 'uaxl',
    image: '/logos/logo.png',
    cmds: [
      'axelard q evm token-address ethereum uaxl',
    ],
  },
  {
    id: 'uphoton',
    cmds: [
      'axelard q evm token-address ethereum uphoton',
    ],
  },
];

module.exports = { bridge_accounts };