import React, { Component } from 'react';
import { Container, Nav, Navbar as RBNavbar } from 'react-bootstrap';
import { Link } from 'react-router-dom';

class Navbar extends Component {
  render() {
    let account = '';

    if (this.props.accounts.length > 0) {
      account = this.props.accounts[0];
    }

    return (
      <RBNavbar bg="dark" expand="md" fixed="top" variant="dark">
        <Container>
          <RBNavbar.Brand>Lok<strong>eth</strong></RBNavbar.Brand>
          <RBNavbar.Toggle />
          <RBNavbar.Collapse>
            <Nav className="mr-auto">
              <Nav.Link to="/" as={Link}>Events</Nav.Link>
              <Nav.Link to="/about" as={Link}>About</Nav.Link>
            </Nav>
            {
              account.length > 0 && (
                <RBNavbar.Text>
                  {'Signed in as: '}
                  <strong>
                    {`${account.substr(0, 6)}...${account.substr(-4)}`}
                  </strong>
                </RBNavbar.Text>
              )
            }
          </RBNavbar.Collapse>
        </Container>
      </RBNavbar>
    );
  }
}

export default Navbar;
