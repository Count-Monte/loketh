import React, { Component } from 'react';
import { Card } from 'react-bootstrap';
import { FaCalendarAlt, FaEthereum, FaUserCircle } from 'react-icons/fa';

import IconWithText from './IconWithText';

class Event extends Component {
  render() {
    const {
      event,
      onClickTitle = () => {}
    } = this.props;

    return (
      <Card>
        <Card.Body>
          <Card.Title>
            <Card.Link
              href="#"
              onClick={e => {
                e.preventDefault();

                onClickTitle(event.id);
              }}
            >
              {event.shortName}
            </Card.Link>
          </Card.Title>
          <Card.Text>
            <IconWithText icon={FaCalendarAlt}>
              {event.displayDate}
            </IconWithText>
          </Card.Text>
          <Card.Text>
            <IconWithText icon={FaEthereum}>
              {event.priceInEth} ETH
            </IconWithText>
          </Card.Text>
        </Card.Body>
        <Card.Footer>
          <Card.Text>
            <IconWithText icon={FaUserCircle}>
              <Card.Text>{event.shortOrganizer}</Card.Text>
            </IconWithText>
          </Card.Text>
        </Card.Footer>
      </Card>
    );
  }
}

export default Event;
