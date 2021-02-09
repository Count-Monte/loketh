const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const HDWalletProvider = require('@truffle/hdwallet-provider');

const {
  NETWORK_ID,
  NETWORK_ENDPOINT,
  WALLET_MNEMONIC,
  WALLET_ADDRESS_INDEX
} = process.env;

module.exports = {
  // See <http://truffleframework.com/docs/advanced/configuration>
  // to customize your Truffle configuration!
  networks: {
    develop: {
      port: 8545
    },
    production: {
      provider: () => {
        return new HDWalletProvider(
          WALLET_MNEMONIC, NETWORK_ENDPOINT, WALLET_ADDRESS_INDEX
        );
      },
      network_id: NETWORK_ID
    }
  },
  contracts_build_directory: path.join(__dirname, 'client', 'src', 'contracts'),
  compilers: {
    solc: {
      version: '0.7.6'
    }
  }
};
