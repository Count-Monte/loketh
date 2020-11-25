import Web3 from 'web3';

const getWeb3 = (onAccountsChanged = () => {}) =>
  new Promise((resolve, reject) => {
    // Wait for loading completion to avoid race conditions with web3 injection timing.
    window.addEventListener('load', async () => {
      // Modern dapp browsers...
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum);
        try {
          // Request account access if needed
          await window.ethereum.enable();

          window.ethereum.on('accountsChanged', accounts => {
            onAccountsChanged(accounts);
          });

          // Accounts now exposed
          resolve(web3);
        } catch (error) {
          reject(error);
        }
      } else {
        reject(new Error('You have no Metamask installed.'));
      }
    });
  });

export default getWeb3;
