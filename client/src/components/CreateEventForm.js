import React, { Component } from 'react';
import classNames from 'classnames';
import moment from 'moment';
import {
  Button,
  Col,
  Dropdown,
  DropdownButton,
  Form,
  InputGroup,
  Modal,
  Row,
  Spinner
} from 'react-bootstrap';
import { FaCalendar, FaEthereum, FaUsers } from 'react-icons/fa';

import Datetime from './Datetime';
import { handleError, toWei } from '../utils';

const etherUnits = {
  ether: 'Ether',
  gwei: 'Gwei',
  wei: 'Wei'
};

const initialEvent = () => ({
  name: '',
  startTime: 0,
  endTime: 0,
  price: 1,
  unit: 'ether',
  isFree: false,
  quota: 1
});

const initialEventValidation = () => ({
  validated: false,
  result: false,
  name: false,
  startTime: false,
  endTime: false,
  price: false,
  unit: false,
  quota: false
});

class CreateEventForm extends Component {
  state = {
    event: initialEvent(),
    isCreating: false,
    isCreated: false,
    validation: initialEventValidation()
  };

  formSubmitted = async () => {
    this.setState({ isCreating: true });

    this.validate(async () => {
      const { accounts, loketh } = this.props;

      try {
        const { event, validation } = this.state;

        if (validation.result) {
          await loketh.methods.createEvent(
            event.name,
            event.startTime,
            event.endTime,
            toWei(event.price, event.unit),
            event.quota
          ).send({ from: accounts[0] });

          this.setState({ isCreating: true, isCreated: true });
        } else {
          this.setState({ isCreating: false, isCreated: false });
        }
      } catch (error) {
        handleError(error);

        this.setState({ isCreating: false, isCreated: false });
      }
    });
  };

  validate = (callback = () => {}) => {
    const { event } = this.state;

    const name = event.name.length > 0;
    const startTime = event.startTime > moment().unix();
    const endTime = event.endTime > event.startTime;
    const price = !isNaN(parseInt(event.price)) && event.price >= 0;
    const unit = Object.keys(etherUnits).includes(event.unit);
    const quota = !isNaN(parseInt(event.quota)) && event.quota > 0;

    this.setState({
      validation: {
        validated: true,
        result: (name && startTime && endTime && price && unit && quota),
        name,
        startTime,
        endTime,
        price,
        unit,
        quota
      }
    }, () => {
      callback();
    });
  };

  renderForm = () => {
    const { event, isCreating, isCreated, validation } = this.state;

    const { validated } = validation;
    const startTimeValue = event.startTime > 0
      ? moment.unix(event.startTime)
      : '';
    const endTimeValue = event.endTime > 0
      ? moment.unix(event.endTime)
      : '';

    let submitButtonChildren = null;

    if (isCreating) {
      submitButtonChildren = isCreated
        ? 'You just created a new event!'
        : (<Spinner animation="border" />);
    } else {
      submitButtonChildren = 'Create';
    }

    return (
      <Form noValidate onSubmit={e => {
        e.preventDefault();

        this.formSubmitted();
      }}>
        <Form.Group>
          <InputGroup>
            <InputGroup.Prepend>
              <InputGroup.Text><FaCalendar /></InputGroup.Text>
            </InputGroup.Prepend>
            <Form.Control
              required
              placeholder="Name"
              value={event.name}
              className={classNames({
                'is-valid': validated && validation.name,
                'is-invalid': validated && !validation.name
              })}
              disabled={isCreating}
              onChange={e => {
                const { value: name } = e.target;

                this.setState({ event: { ...event, name } }, () => {
                  this.validate();
                });
              }}
            />
            {
              (validated && !validation.name) && (
                <Form.Control.Feedback type="invalid">
                  Name is required.
                </Form.Control.Feedback>
              )
            }
          </InputGroup>
        </Form.Group>
        <Form.Group>
          <Datetime
            required
            inputProps={{
              className: classNames({
                'is-valid': validated && validation.startTime,
                'is-invalid': validated && !validation.startTime
              }),
              disabled: isCreating
            }}
            placeholder="Start date and time"
            value={startTimeValue}
            isValidDate={currentDate => {
              return currentDate.isSameOrAfter(moment(), 'day');
            }}
            onChange={e => {
              this.setState({
                event: {
                  ...event,
                  startTime: e.unix()
                }
              }, () => {
                this.validate();
              });
            }}
            validationMessage={() => {
              return (validated && !validation.startTime) ? (
                <Form.Control.Feedback type="invalid">
                  Start date and time is required and must be a date and time after now.
                </Form.Control.Feedback>
              ) : null;
            }}
          />
        </Form.Group>
        <Form.Group>
          <Datetime
            required
            inputProps={{
              className: classNames({
                'is-valid': validated && validation.endTime,
                'is-invalid': validated && !validation.endTime
              }),
              disabled: isCreating
            }}
            placeholder="End date and time"
            value={endTimeValue}
            isValidDate={currentDate => {
              return currentDate.isSameOrAfter(startTimeValue, 'day');
            }}
            onChange={e => {
              this.setState({
                event: {
                  ...event,
                  endTime: e.unix()
                }
              }, () => {
                this.validate();
              });
            }}
            validationMessage={() => {
              return (validated && !validation.endTime) ? (
                <Form.Control.Feedback type="invalid">
                  End date and time is required and must be a date and time after start date and time.
                </Form.Control.Feedback>
              ) : null;
            }}
          />
        </Form.Group>
        <Form.Group as={Row} className="align-items-center">
          <InputGroup as={Col} sm="9">
            <InputGroup.Prepend>
              <InputGroup.Text><FaEthereum /></InputGroup.Text>
            </InputGroup.Prepend>
            <Form.Control
              required
              min={0}
              type="number"
              disabled={event.isFree || isCreating}
              placeholder="Price"
              value={event.price}
              className={classNames({
                'is-valid': validated && validation.price,
                'is-invalid': validated && !validation.price
              })}
              onChange={e => {
                const { value: price } = e.target;

                this.setState({ event: { ...event, price } }, () => {
                  this.validate();
                });
              }}
            />
            <DropdownButton
              as={InputGroup.Append}
              disabled={event.isFree || isCreating}
              variant="outline-secondary"
              title={etherUnits[event.unit]}
              id="units-create-form"
            >
              {Object.keys(etherUnits).map((unit, i) => (
                <Dropdown.Item
                  key={i}
                  eventKey={unit}
                  active={event.unit === unit}
                  onSelect={unit => {
                    this.setState({ event: { ...event, unit } });
                  }}
                >
                  {etherUnits[unit]}
                </Dropdown.Item>
              ))}
            </DropdownButton>
            {
              (validated && !validation.price) && (
                <Form.Control.Feedback type="invalid">
                  Price is required and must be at least zero (free).
                </Form.Control.Feedback>
              )
            }
          </InputGroup>
          <Col sm="3">
            <Form.Check
              custom
              type="checkbox"
              id="is-free-create-form"
              label="Free"
              checked={event.isFree}
              disabled={isCreating}
              onChange={e => {
                const { checked: isFree } = e.target;
                const price = isFree ? 0 : (event.price || 0);
                const unit = isFree ? 'ether' : event.unit;

                this.setState({
                  event: {
                    ...event,
                    isFree,
                    price,
                    unit
                  }
                }, () => {
                  this.validate();
                });
              }}
            />
          </Col>
        </Form.Group>
        <Form.Group>
          <InputGroup>
            <InputGroup.Prepend>
              <InputGroup.Text><FaUsers /></InputGroup.Text>
            </InputGroup.Prepend>
            <Form.Control
              required
              min={1}
              type="number"
              placeholder="Quota"
              value={event.quota}
              className={classNames({
                'is-valid': validated && validation.quota,
                'is-invalid': validated && !validation.quota
              })}
              disabled={isCreating}
              onChange={e => {
                const { value: quota } = e.target;

                this.setState({ event: { ...event, quota } }, () => {
                  this.validate();
                });
              }}
            />
            {
              (validated && !validation.quota) && (
                <Form.Control.Feedback type="invalid">
                  Quota is required and must be at least one.
                </Form.Control.Feedback>
              )
            }
          </InputGroup>
        </Form.Group>
        <Button
          variant="primary"
          type="submit"
          block
          disabled={isCreating}
        >
          {submitButtonChildren}
        </Button>
      </Form>
    );
  };

  render() {
    const {
      onHide = () => {},
      show
    } = this.props;

    const { isCreating, isCreated } = this.state;

    return (
      <Modal
        show={show}
        onHide={() => {
          this.setState({
            event: initialEvent(),
            isCreating: false,
            isCreated: false,
            validation: initialEventValidation()
          }, () => {
            onHide();
          });
        }}
        backdrop="static"
        keyboard={false}
        centered
      >
        <Modal.Header closeButton={!isCreating || isCreated}>
          <Modal.Title>Create a new event</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {this.renderForm()}
        </Modal.Body>
      </Modal>
    );
  }
}

export default CreateEventForm;
