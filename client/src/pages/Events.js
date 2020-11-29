import React, { Component, Fragment } from 'react';
import classNames from 'classnames';
import { Col, Row, Spinner } from 'react-bootstrap';

import { BuyTicketForm, Event, Pagination } from '../components';
import { arrayChunk, descPagination, handleError, toEvent } from '../utils';

const CHUNK = 3;

class Events extends Component {
  state = {
    events: [],
    loaded: false,
    page: 1,
    paginationHasPrev: false,
    paginationHasNext: false,
    perPage: 12,
    selectedEvent: null,
    showBuyTicket: false,
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
      this.setState({ events: [], loaded: false });

      const { accounts, loketh } = this.props;

      const totalEvents = await loketh.methods.totalEvents().call({
        from: accounts[0]
      });

      this.setState({ page, totalEvents }, async () => {
        const { page, perPage, totalEvents } = this.state;

        const {
          maxId,
          minId,
          hasPrev: paginationHasPrev,
          hasNext: paginationHasNext
        } = descPagination(totalEvents, page, perPage, false);

        const events = [];

        for (let i = maxId; i > minId; i--) {
          const event = await loketh.methods.getEvent(i).call({
            from: accounts[0]
          });

          events.push(toEvent(event, i));
        }

        this.setState({
          events: arrayChunk(events, CHUNK),
          loaded: true,
          paginationHasPrev,
          paginationHasNext
        });
      });
    } catch (error) {
      handleError(error);
    }
  };

  render() {
    const { accounts, loketh } = this.props;

    const {
      events,
      loaded,
      page,
      paginationHasPrev,
      paginationHasNext,
      perPage,
      selectedEvent,
      showBuyTicket,
      totalEvents
    } = this.state;

    const fromData = ((page - 1) * perPage) + 1;
    const toData = paginationHasNext ? page * perPage : totalEvents;

    return (
      <Fragment>
        <h1 className="mt-1">Events</h1>
        {
          loaded ? (
            events.length > 0 ? (events.map((chunk, i) => {
              const filler = [];

              for (let x = 0; x < (CHUNK - chunk.length); x++) {
                filler.push(<Col key={x} />);
              }

              const rowClassName = classNames({ 'mt-4': i > 0 });

              return (
                <Row className={rowClassName} key={i}>
                  {chunk.map((event, j) => (
                    <Col key={j}>
                      <Event
                        event={event}
                        onClickTitle={() => {
                          this.setState({
                            selectedEvent: event,
                            showBuyTicket: true
                          });
                        }}
                      />
                    </Col>
                  ))}
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
            <Pagination
              from={fromData}
              hasPrev={paginationHasPrev}
              hasNext={paginationHasNext}
              onClickPrev={() => {
                this.getEvents(page - 1);
              }}
              onClickNext={() => {
                this.getEvents(page + 1);
              }}
              to={toData}
              total={totalEvents}
            />
          )
        }
        {
          loaded && (
            <BuyTicketForm
              accounts={accounts}
              event={selectedEvent}
              loketh={loketh}
              onHide={() => {
                this.setState({ showBuyTicket: false });
              }}
              show={showBuyTicket}
            />
          )
        }
      </Fragment>
    );
  }
}

export default Events;
