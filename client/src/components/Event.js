import React, { Component } from 'react';
import { Card } from 'react-bootstrap';
import { FaCalendarAlt, FaMoneyBillAlt, FaUserCircle } from 'react-icons/fa';

import IconWithText from './IconWithText';
import { epochToEventDate, getShortAddress, strLimit } from '../utils';

class Event extends Component {
  render() {
    const { event, web3 } = this.props;

    const name = strLimit(event['0'], 30);
    const organizer = getShortAddress(event['1']);
    const startTime = epochToEventDate(event['2']);
    const endTime = epochToEventDate(event['3']);
    const date = startTime === endTime
      ? startTime
      : `${startTime} - ${endTime}`;
    const price = web3.utils.fromWei(event['4'], 'ether');

    return (
      <Card>
        <Card.Body>
          <Card.Title>
            <Card.Link>{name}</Card.Link>
          </Card.Title>
          <Card.Text>
            <IconWithText icon={FaCalendarAlt}>{date}</IconWithText>
          </Card.Text>
          <Card.Text>
            <IconWithText icon={FaMoneyBillAlt}>{price} ETH</IconWithText>
          </Card.Text>
        </Card.Body>
        <Card.Footer>
          <Card.Text>
            <IconWithText icon={FaUserCircle}>
              <Card.Text>{organizer}</Card.Text>
            </IconWithText>
          </Card.Text>
        </Card.Footer>
      </Card>
    );
  }
}

export default Event;
