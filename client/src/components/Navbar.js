import React, { Component } from 'react';
import { Container, Nav, Navbar as RBNavbar, Spinner } from 'react-bootstrap';
import { Link } from 'react-router-dom';

import { getShortAddress } from '../utils';

class Navbar extends Component {
  render() {
    let account = '';

    if (this.props.accounts.length > 0) {
      account = this.props.accounts[0];
    }

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
              account.length > 0 ? (
                <RBNavbar.Text>
                  {'Signed in as: '}
                  <strong>
                    {getShortAddress(account)}
                  </strong>
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
