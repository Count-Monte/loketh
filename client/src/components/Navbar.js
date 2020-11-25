import React, { Component } from 'react';
import { Container, Nav, Navbar as RBNavbar, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';

import { getShortAddress, handleError } from '../utils';

class Navbar extends Component {
  state = { account: '', balance: 0, loaded: false };

  componentDidMount = async () => {
    if (this.props.initialized) {
      await this.getAccount();

      this.listenToTicketIssued();
    }
  };

  componentDidUpdate = async (prevProps) => {
    if (
      this.props.initialized &&
      this.props.initialized !== prevProps.initialized
    ) {
      await this.getAccount();

      this.listenToTicketIssued();
    }
  };

  listenToTicketIssued = () => {
    console.log('listenToTicketIssued');
    const { accounts, loketh } = this.props;

    loketh.events.TicketIssued({ participant: accounts[0] }).on('data', () => {
      console.log('TicketIssued');
      this.getAccount();
    });
  };

  getAccount = async () => {
    try {
      this.setState({ loaded: false });

      const { accounts, web3 } = this.props;

      const [account] = accounts;

      const balance = web3.utils.fromWei(
        await web3.eth.getBalance(account), 'ether'
      );

      this.setState({
        account: getShortAddress(account),
        balance: parseFloat(balance).toFixed(4),
        loaded: true
      });
    } catch (error) {
      handleError(error);
    }
  };

  render() {
    const { account, balance, loaded } = this.state;

    return (
      <RBNavbar bg="dark" expand="md" sticky="top" variant="dark">
        <Container>
          <RBNavbar.Brand>Lok<strong>eth</strong></RBNavbar.Brand>
          <RBNavbar.Toggle />
          <RBNavbar.Collapse>
            <Nav className="mr-auto" defaultActiveKey="events">
              <Nav.Link to="/" as={Link} eventKey="events">
                Events
              </Nav.Link>
              <Nav.Link to="/user/events" as={Link} eventKey="my-events">
                My Events
              </Nav.Link>
              <Nav.Link to="/about" as={Link} eventKey="about">
                About
              </Nav.Link>
            </Nav>
            {
              loaded ? (
                <RBNavbar.Text>
                  Signed in as: <strong>{account} ({balance} ETH)</strong>
                </RBNavbar.Text>
              ) : (
                <Spinner animation="grow" variant="light" />
              )
            }
          </RBNavbar.Collapse>
        </Container>
      </RBNavbar>
    );
  }
}

export default Navbar;
