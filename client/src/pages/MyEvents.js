import React, { Component, Fragment } from 'react';
import classNames from 'classnames';
import { Button, Col, Row, Spinner } from 'react-bootstrap';
import { FaCalendarPlus } from 'react-icons/fa';

import {
  CreateEventForm,
  Event,
  IconWithText,
  Pagination,
  WithdrawalForm
} from '../components';
import { arrayChunk, descPagination, handleError, toEvent } from '../utils';

const CHUNK = 3;

class MyEvents extends Component {
  _isMounted = false;

  state = {
    events: [],
    loaded: false,
    page: 1,
    paginationHasPrev: false,
    paginationHasNext: false,
    perPage: 12,
    selectedEvent: null,
    showCreate: false,
    showWithdrawal: false,
    totalEvents: 0
  };

  componentDidMount = async () => {
    this._isMounted = true;

    if (this.props.initialized) {
      await this.getEvents();

      this.listenToTicketIssued();
    }
  };

  componentDidUpdate = async (prevProps) => {
    if (
      this.props.initialized &&
      this.props.initialized !== prevProps.initialized
    ) {
      await this.getEvents();

      this.listenToTicketIssued();
    }
  };

  componentWillUnmount = () => {
    this._isMounted = false;
  };

  getEvents = async (page = 1, reload = true) => {
    try {
      if (reload) {
        this.setState({ events: [], loaded: false });
      }

      const { accounts, loketh } = this.props;

      const [account] = accounts;

      const eventIds = await loketh.methods.eventsOfOwner(account).call({
        from: account
      });

      const totalEvents = eventIds.length;

      this.setState({ page, totalEvents }, async () => {
        const { page, perPage, totalEvents } = this.state;

        const {
          maxId,
          minId,
          hasPrev: paginationHasPrev,
          hasNext: paginationHasNext
        } = descPagination(totalEvents, page, perPage);

        const events = [];

        for (let i = maxId; i > minId; i--) {
          const id = eventIds[i];

          const event = await loketh.methods.getEvent(id).call({
            from: account
          });

          events.push(toEvent(event, id));
        }

        this.setState({
          events: arrayChunk(events, CHUNK),
          loaded: true,
          paginationHasPrev,
          paginationHasNext
        }, () => {
          this.listenToTicketIssued();
        });
      });
    } catch (error) {
      handleError(error);
    }
  };

  listenToTicketIssued = () => {
    const { events, page } = this.state;

    const eventIds = [];

    for (const chunks of events) {
      for (const event of chunks) {
        eventIds.push(event.id);
      }
    }

    const filter = { eventId: eventIds };

    this.props.loketh.events.TicketIssued({ filter }).on('data', () => {
      if (this._isMounted) {
        this.getEvents(page, false);
      }
    });
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
      showCreate,
      showWithdrawal,
      totalEvents
    } = this.state;

    const fromData = ((page - 1) * perPage) + 1;
    const toData = paginationHasNext ? page * perPage : totalEvents;

    return (
      <Fragment>
        <div className="mt-1 position-relative">
          <h1>My Events</h1>
          <div
            className="position-absolute"
            style={{ top: '0px', right: '0px' }}
          >
            <Button
              variant="primary"
              onClick={() => {
                this.setState({ showCreate: true });
              }}
            >
              <IconWithText icon={FaCalendarPlus}>Create</IconWithText>
            </Button>
          </div>
        </div>
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
                        forOrganizer
                        onClickTitle={() => {
                          this.setState({
                            selectedEvent: event,
                            showWithdrawal: true
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
                You have no events.
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
            <Fragment>
              <CreateEventForm
                accounts={accounts}
                loketh={loketh}
                onHide={() => {
                  this.setState({ showCreate: false });

                  this.getEvents(1, false);
                }}
                show={showCreate}
              />
              <WithdrawalForm
                accounts={accounts}
                event={selectedEvent}
                loketh={loketh}
                onHide={() => {
                  this.setState({ showWithdrawal: false });

                  this.getEvents(page, false);
                }}
                show={showWithdrawal}
              />
            </Fragment>
          )
        }
      </Fragment>
    );
  }
}

export default MyEvents;
