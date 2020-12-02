# Loketh

An experimental smart contract implementation of event ticketing system, running on top of [Ethereum](https://ethereum.org/) blockchain.

## Disclaimer

Once again, this is just an experimental smart contract implementation of event ticketing system.

The author has no responsibility about security, transactions, or any usage of this app.

## Installation

### Requirements

Loketh has a few system requirements, make sure your machine has:

- [Node.js >= v10](https://nodejs.org/)
- [Truffle](https://www.trufflesuite.com/truffle)
- [Ganache](https://www.trufflesuite.com/ganache) (Optional, for local development)

### Installing Loketh Smart Contract

*First*, you need to clone this repository into your machine.

```
git clone https://github.com/rymanalu/loketh.git
```

Make sure you are in the root directory of Loketh (e.g., `/path/to/loketh`) before continue to the next steps.

*Second*, if you want to deploy the smart contracts into real network (Mainnet or Testnets), you need to follow this steps. But if you are using Ganache, you can skip this one.

1. Create a new file named `.env` by copying from `.env.example`.

```
cp .env.example .env
```

2. Fill all the params in `.env` with the correct values.

```
// .env

NETWORK_ID=5
NETWORK_ENDPOINT=https://example.endpoint.com
WALLET_MNEMONIC="this is just an example of mnemonic do not use this okay"
WALLET_ADDRESS_INDEX=0
```

*Third*, install all smart contract dependencies.

```
npm install
```

*Fourth*, compile and deploy the smart contracts.

```
truffle migrate
```

You can specify the network you want to deploy by using `--network` option.

That's all. Now, let's continue to installing Loketh client.

### Installing Loketh Client

*First*, let's move to the `client` directory.

```
cd client
```

*Second*, create a new file named `.env` by copying from `.env.example`.

```
cp .env.example .env
```

*Third*, fill all the params in `.env` with the correct values.

```
// client/.env

REACT_APP_NETWORK_ID=5
```

*Fourth*, install all Loketh client dependencies.

```
npm install
```

*Fifth*, run the client.

```
npm start
```

Loketh client is a [React](https://reactjs.org/) app. You can run `npm run build` to builds the app for production.

## License

Loketh is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
