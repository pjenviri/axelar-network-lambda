const bridge_accounts = [
  {
    id: 'bitcoin',
    image: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
    cmds: [
      'axelard q bitcoin consolidation-address --key-id btc-master-genesis',
    ],
  },
  {
    id: 'ethereum',
    image: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
    cmds: [
      'axelard q evm gateway-address ethereum',
      'axelard q evm address ethereum --key-role master',
    ],
  },
  {
    id: 'satoshi',
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