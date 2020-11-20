import React, { Component, Fragment } from 'react';
import { CardColumns, Card, Spinner } from 'react-bootstrap';
import { FaCalendarAlt, FaMoneyBillAlt, FaUserCircle } from 'react-icons/fa';

import { IconWithText } from '../components';
import { epochToEventDate, getShortAddress, strLimit } from '../utils';

class Events extends Component {
  state = { events: [], loaded: false };

  componentDidMount = async () => {
    if (this.props.initialized) {
      await this.getEvents();
    }
  };

  componentDidUpdate = async (prevProps) => {
    if (
      this.props.initialized &&
      this.props.initialized !== prevProps.initialized
    ) {
      await this.getEvents();
    }
  };

  getEvents = async () => {
    try {
      this.setState({ events: [], loaded: false });

      const { accounts, loketh } = this.props;

      const totalEvents = await loketh.methods.totalEvents().call({
        from: accounts[0]
      });

      const events = [];

      for (let i = totalEvents; i > 0; i--) {
        const event = await loketh.methods.getEvent(i).call({
          from: accounts[0]
        });

        const startTime = epochToEventDate(event['2']);
        const endTime = epochToEventDate(event['3']);

        events.push({
          name: event['0'],
          organizer: event['1'],
          startTime,
          endTime,
          onlyOneDay: startTime === endTime,
          price: this.props.web3.utils.toBN(event['4'])
        });
      }

      this.setState({ events, loaded: true });
    } catch (error) {
      alert('Failed to load events. Check console for details.');

      console.error(error);
    }
  };

  render() {
    const { events, loaded } = this.state;

    return (
      <Fragment>
        <h1>Events</h1>
        {
          loaded ? (
            events.length > 0 ? (
              <CardColumns>
                {events.map((event, i) => {
                  return (
                    <Card key={i}>
                      <Card.Body>
                        <Card.Title>
                          <Card.Link>
                            {strLimit(event.name, 30)}
                          </Card.Link>
                        </Card.Title>
                        <Card.Text>
                          <IconWithText icon={FaCalendarAlt}>
                            {
                              event.onlyOneDay ? event.startTime : (
                                `${event.startTime} - ${event.endTime}`
                              )
                            }
                          </IconWithText>
                        </Card.Text>
                        <Card.Text>
                          <IconWithText icon={FaMoneyBillAlt}>
                            {this.props.web3.utils.fromWei(
                              event.price, 'ether'
                            )} ETH
                          </IconWithText>
                        </Card.Text>
                      </Card.Body>
                      <Card.Footer>
                        <Card.Text>
                          <IconWithText icon={FaUserCircle}>
                            <Card.Link>
                              {getShortAddress(event.organizer)}
                            </Card.Link>
                          </IconWithText>
                        </Card.Text>
                      </Card.Footer>
                    </Card>
                  );
                })}
              </CardColumns>
            ) : (
              <p>There are no upcoming events at this time.</p>
            )
          ) : (
            <Spinner animation="border" />
          )
        }
      </Fragment>
    );
  }
}

export default Events;
