import React, { Component } from 'react';
import { Container, Nav, Navbar as RBNavbar, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';

import { fromWei, getShortAddress, handleError } from '../utils';

class Navbar extends Component {
  eventCreatedListener = null;

  moneyWithdrawnListener = null;

  ticketIssuedListener = null;

  state = { account: '', balance: 0, loaded: false };

  componentDidMount = async () => {
    if (this.props.initialized) {
      await this.getAccount();

      this.listenToEventCreated();
      this.listenToMoneyWithdrawn();
      this.listenToTicketIssued();
    }
  };

  componentDidUpdate = async (prevProps) => {
    if (
      this.props.initialized &&
      this.props.initialized !== prevProps.initialized
    ) {
      await this.getAccount();

      this.listenToEventCreated();
      this.listenToMoneyWithdrawn();
      this.listenToTicketIssued();
    }
  };

  getAccount = async () => {
    try {
      this.setState({ loaded: false });

      const { accounts, web3 } = this.props;

      const [account] = accounts;

      const balance = await web3.eth.getBalance(account);

      this.setState({
        account: getShortAddress(account),
        balance: fromWei(balance),
        loaded: true
      });
    } catch (error) {
      handleError(error);
    }
  };

  listenToEventCreated = () => {
    const { accounts, loketh } = this.props;

    const event = 'data';
    const callback = () => {
      this.getAccount();
    };

    if (this.eventCreatedListener) {
      this.eventCreatedListener.off(event, callback);
      this.eventCreatedListener = null;
    }

    const filter = { organizer: accounts[0] };

    this.eventCreatedListener = loketh.events.EventCreated({ filter });
    this.eventCreatedListener.on(event, callback);
  };

  listenToMoneyWithdrawn = () => {
    const { accounts, loketh } = this.props;

    const event = 'data';
    const callback = () => {
      this.getAccount();
    };

    if (this.moneyWithdrawnListener) {
      this.moneyWithdrawnListener.off(event, callback);
      this.moneyWithdrawnListener = null;
    }

    const filter = { recipient: accounts[0] };

    this.moneyWithdrawnListener = loketh.events.MoneyWithdrawn({ filter });
    this.moneyWithdrawnListener.on(event, callback);
  };

  listenToTicketIssued = () => {
    const { accounts, loketh } = this.props;

    const event = 'data';
    const callback = () => {
      this.getAccount();
    };

    if (this.ticketIssuedListener) {
      this.ticketIssuedListener.off(event, callback);
      this.ticketIssuedListener = null;
    }

    const filter = { participant: accounts[0] };

    this.ticketIssuedListener = loketh.events.TicketIssued({ filter });
    this.ticketIssuedListener.on('data', () => {
      this.getAccount();
    });
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
              <Nav.Link to="/my-events" as={Link} eventKey="my-events">
                My Events
              </Nav.Link>
              <Nav.Link to="/my-tickets" as={Link} eventKey="my-tickets">
                My Tickets
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
