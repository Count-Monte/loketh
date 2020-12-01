import React, { Component } from 'react';
import { Form, InputGroup } from 'react-bootstrap';
import BaseDatetime from 'react-datetime';
import { FaCalendarAlt } from 'react-icons/fa';

import 'react-datetime/css/react-datetime.css';

class Datetime extends Component {
  render() {
    const {
      placeholder = '',
      required = false,
      validationMessage = () => {},
      ...props
    } = this.props;

    return (
      <BaseDatetime
        {...props}
        dateFormat="DD MMM YYYY"
        timeFormat="HH:mm"
        timeConstraints={{ minutes: { step: 5 } }}
        renderInput={props => {
          return (
            <InputGroup>
              <InputGroup.Prepend>
                <InputGroup.Text><FaCalendarAlt /></InputGroup.Text>
              </InputGroup.Prepend>
              <Form.Control
                {...props}
                readOnly
                required={required}
                placeholder={placeholder}
              />
              {validationMessage()}
            </InputGroup>
          );
        }}
      />
    );
  }
}

export default Datetime;
