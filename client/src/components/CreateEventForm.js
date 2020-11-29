import React, { Component } from 'react';
import moment from 'moment';
import {
  Button,
  Col,
  Dropdown,
  DropdownButton,
  Form,
  InputGroup,
  Modal,
  Row
} from 'react-bootstrap';
import { FaCalendar, FaEthereum, FaUserFriends } from 'react-icons/fa';

import Datetime from './Datetime';

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

class CreateEventForm extends Component {
  state = {
    event: initialEvent()
  };

  render() {
    const {
      onHide = () => {},
      show
    } = this.props;

    const { event } = this.state;

    const startTimeValue = event.startTime > 0
      ? moment(event.startTime * 1000)
      : '';
    const endTimeValue = event.endTime > 0
      ? moment(event.endTime * 1000)
      : '';

    return (
      <Modal
        show={show}
        onHide={() => {
          this.setState({
            event: initialEvent()
          }, () => {
            onHide();
          });
        }}
        backdrop="static"
        keyboard={false}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Create a new event</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form noValidate onSubmit={e => {
            e.preventDefault();
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
                  onChange={e => {
                    const { value: name } = e.target;

                    this.setState({ event: { ...event, name } });
                  }}
                />
              </InputGroup>
            </Form.Group>
            <Form.Group>
              <Datetime
                required
                placeholder="Start date and time"
                value={startTimeValue}
                isValidDate={currentDate => {
                  return currentDate.isSameOrAfter(moment(), 'day');
                }}
                onChange={e => {
                  this.setState({ event: { ...event, startTime: e.unix() } });
                }}
              />
            </Form.Group>
            <Form.Group>
              <Datetime
                required
                placeholder="End date and time"
                value={endTimeValue}
                isValidDate={currentDate => {
                  return currentDate.isSameOrAfter(startTimeValue, 'day');
                }}
                onChange={e => {
                  this.setState({ event: { ...event, endTime: e.unix() } });
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
                  min={1}
                  type="number"
                  disabled={event.isFree}
                  placeholder="Price"
                  value={event.price}
                  onChange={e => {
                    const { value: price } = e.target;

                    this.setState({ event: { ...event, price: price || 1 } });
                  }}
                />
                <DropdownButton
                  as={InputGroup.Append}
                  disabled={event.isFree}
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
              </InputGroup>
              <Col sm="3">
                <Form.Check
                  custom
                  type="checkbox"
                  id="is-free-create-form"
                  label="Free"
                  checked={event.isFree}
                  onChange={e => {
                    const { checked: isFree } = e.target;
                    const price = isFree ? 0 : (event.price || 1);
                    const unit = isFree ? 'ether' : event.unit;

                    this.setState({ event: { ...event, isFree, price, unit } });
                  }}
                />
              </Col>
            </Form.Group>
            <Form.Group>
              <InputGroup>
                <InputGroup.Prepend>
                  <InputGroup.Text><FaUserFriends /></InputGroup.Text>
                </InputGroup.Prepend>
                <Form.Control
                  required
                  min={1}
                  type="number"
                  placeholder="Quota"
                  value={event.quota}
                  onChange={e => {
                    const { value: quota } = e.target;

                    this.setState({ event: { ...event, quota: quota || 1 } });
                  }}
                />
              </InputGroup>
            </Form.Group>
            <Button
              variant="primary"
              type="submit"
              block
            >
              Create
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    );
  }
}

export default CreateEventForm;
