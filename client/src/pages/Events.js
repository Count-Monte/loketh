import React, { Component, Fragment } from 'react';
import classNames from 'classnames';
import { Card, Col, Pagination, Row, Spinner } from 'react-bootstrap';
import { FaCalendarAlt, FaMoneyBillAlt, FaUserCircle } from 'react-icons/fa';

import { IconWithText } from '../components';
import {
  arrayChunk,
  epochToEventDate,
   getShortAddress,
   strLimit
} from '../utils';

class Events extends Component {
  state = {
    events: [],
    loaded: false,
    page: 1,
    paginationHasPrev: false,
    paginationHasNext: false,
    perPage: 12,
    totalEvents: 0
  };

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

  getEvents = async (page = 1) => {
    try {
      this.setState({ events: [], loaded: false, page });

      const { accounts, loketh } = this.props;

      const totalEvents = await loketh.methods.totalEvents().call({
        from: accounts[0]
      });

      this.setState({ totalEvents }, async () => {
        const { page, perPage, totalEvents } = this.state;

        const maxId = totalEvents - ((page - 1) * perPage);
        const minId = ((maxId - perPage) < 0) ? 0 : (maxId - perPage);

        const paginationHasPrev = maxId < totalEvents;
        const paginationHasNext = minId > 0;

        const events = [];

        for (let i = maxId; i > minId; i--) {
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

        this.setState({
          events: arrayChunk(events, 3),
          loaded: true,
          paginationHasPrev,
          paginationHasNext
        });
      });
    } catch (error) {
      alert('Failed to load events. Check console for details.');

      console.error(error);
    }
  };

  render() {
    const {
      events,
      loaded,
      page,
      paginationHasPrev,
      paginationHasNext,
      perPage,
      totalEvents
    } = this.state;

    const fromData = ((page - 1) * perPage) + 1;
    const toData = paginationHasNext ? page * perPage : totalEvents;

    return (
      <Fragment>
        <h1>Events</h1>
        {
          loaded ? (
            events.length > 0 ? (events.map((chunk, i) => {
              let filler = null;

              if (chunk.length === 1) {
                filler = (
                  <Fragment>
                    <Col />
                    <Col />
                  </Fragment>
                );
              } else if (chunk.length === 2) {
                filler = (<Col />);
              }

              // eslint-disable-next-line
              const rowClassName = classNames({ ['mt-4']: i > 0 });

              return (
                <Row className={rowClassName} key={i}>
                  {chunk.map((event, j) => {
                    return (
                      <Col key={j}>
                        <Card>
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
                      </Col>
                    );
                  })}
                  {filler}
                </Row>
              );
            })) : (
              <p className="text-center">
                There are no upcoming events at this time.
              </p>
            )
          ) : (
            <div className="d-flex justify-content-center">
              <Spinner animation="border" />
            </div>
          )
        }
        {
          events.length > 0 && (
            <Fragment>
              <Pagination className="d-flex justify-content-center mt-4">
                {
                  paginationHasPrev && (
                    <Pagination.Prev onClick={() => {
                      this.getEvents(page - 1);
                    }} />
                  )
                }
                {
                  paginationHasNext && (
                    <Pagination.Next onClick={() => {
                      this.getEvents(page + 1);
                    }} />
                  )
                }
              </Pagination>
              <p className="text-center">
                Showing {fromData} to {toData} of {totalEvents} events
              </p>
            </Fragment>
          )
        }
      </Fragment>
    );
  }
}

export default Events;
