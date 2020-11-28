import React, { Component } from 'react';
import { Card } from 'react-bootstrap';
import {
  FaCalendarAlt,
  FaEthereum,
  FaUserCircle,
  FaUserFriends
} from 'react-icons/fa';

import IconWithText from './IconWithText';

class Event extends Component {
  render() {
    const {
      event,
      forOrganizer = false,
      forParticipant = false,
      onClickTitle = () => {}
    } = this.props;

    return (
      <Card>
        <Card.Body>
          <Card.Title>
            {
              forParticipant ? event.shortName : (
                <Card.Link
                  href="#"
                  onClick={e => {
                    e.preventDefault();

                    onClickTitle(event.id);
                  }}
                >
                  {event.shortName}
                </Card.Link>
              )
            }
          </Card.Title>
          {
            (forParticipant || forOrganizer) ? (
              [event.startTimeDisplay, event.endTimeDisplay].map((date, i) => (
                <Card.Text key={i}>
                  <IconWithText icon={FaCalendarAlt}>{date}</IconWithText>
                </Card.Text>
              ))
            ) : (
              <Card.Text>
                <IconWithText icon={FaCalendarAlt}>
                  {event.displayDate}
                </IconWithText>
              </Card.Text>
            )
          }
          <Card.Text>
            <IconWithText icon={FaEthereum}>
              {event.priceInEth} ETH
            </IconWithText>
          </Card.Text>
          {
            forOrganizer && (
              <Card.Text>
                <IconWithText icon={FaUserFriends}>
                  {`${event.soldCounter} / ${event.quota}`}
                </IconWithText>
              </Card.Text>
            )
          }
        </Card.Body>
        <Card.Footer>
          <Card.Text>
            {
              forOrganizer ? (
                <IconWithText icon={FaEthereum}>
                  <Card.Text>{event.moneyCollectedInEth} ETH</Card.Text>
                </IconWithText>
              ) : (
                <IconWithText icon={FaUserCircle}>
                  <Card.Text>{event.shortOrganizer}</Card.Text>
                </IconWithText>
              )
            }
          </Card.Text>
        </Card.Footer>
      </Card>
    );
  }
}

export default Event;
