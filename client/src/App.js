import React, { Component } from 'react';
import { Container } from 'react-bootstrap';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';

import 'bootstrap/dist/css/bootstrap.min.css';

import { Navbar } from './components';
import LokethContract from './contracts/Loketh.json';
import { About, Home } from './pages';
import getWeb3 from './getWeb3';

import './App.css';

class App extends Component {
  state = {
    accounts: [],
    contract: null,
    web3: null
  };

  componentDidMount = async () => {
    try {
      const web3 = await getWeb3(accounts => {
        this.setState({ accounts });
      });

      const accounts = await web3.eth.getAccounts();
      const networkId = await web3.eth.net.getId();

      const deployedNetwork = LokethContract.networks[networkId];
      const instance = new web3.eth.Contract(
        LokethContract.abi,
        deployedNetwork && deployedNetwork.address,
      );

      this.setState({ accounts, contract: instance, web3 });
    } catch (error) {
      // Catch any errors for any of the above operations.
      alert(
        `Failed to load web3, accounts, or contract. Check console for details.`,
      );
      console.error(error);
    }
  };

  render() {
    const { accounts } = this.state;

    return (
      <Router>
        <Navbar accounts={accounts} />
        <Container as="main">
          <Switch>
            <Route path="/about">
              <About />
            </Route>
            <Route path="/">
              <Home />
            </Route>
          </Switch>
        </Container>
      </Router>
    );
  }
}

export default App;
