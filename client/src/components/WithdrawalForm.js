import React, { Component } from 'react';
import classNames from 'classnames';
import {
  Button,
  Form,
  InputGroup,
  Modal,
  Spinner,
  Tab,
  Tabs
} from 'react-bootstrap';
import { FaUser } from 'react-icons/fa';

import { handleError, isAddress, toEvent } from '../utils';

class WithdrawalForm extends Component {
  state = {
    activeTab: 'check',
    addressToCheck: '',
    event: null,
    isAddressValid: false,
    isValidatingAddress: false,
    isWithdrawalSucceed: false,
    isWithdrawing: false,
    loaded: false
  };

  componentDidMount = async () => {
    await this.getEvent();
  };

  componentDidUpdate = async (prevProps, prevState) => {
    if (
      (this.props.event !== prevProps.event) ||
      (
        !this.state.loaded && (
          this.state.loaded !== prevState.loaded
        )
      )
    ) {
      await this.getEvent();
    }
  };

  getEvent = async () => {
    try {
      this.setState({ loaded: false });

      const { accounts, event: e, loketh } = this.props;

      const [account] = accounts;

      if (e) {
        const event = await loketh.methods.getEvent(e.id).call({
          from: account
        });

        this.setState({
          event: toEvent(event, e.id),
          loaded: true
        });
      }
    } catch (error) {
      handleError(error);
    }
  };

  withdraw = async (event) => {
    this.setState({ isWithdrawing: true });

    const { accounts, loketh } = this.props;

    try {
      await loketh.methods.withdrawMoney(event.id).send({
        from: accounts[0]
      });

      this.setState({ isWithdrawalSucceed: true, isWithdrawing: true });
    } catch (error) {
      handleError(error);

      this.setState({ isWithdrawalSucceed: false, isWithdrawing: false });
    }
  };

  renderCheck = () => {
    const { accounts, loketh } = this.props;
    const {
      addressToCheck,
      event,
      isAddressValid,
      isValidatingAddress
    } = this.state;

    return (
      <Form className="mt-2" noValidate onSubmit={async (e) => {
        e.preventDefault();

        const isValidAddress = isAddress(addressToCheck);

        if (isValidAddress) {
          const result = await loketh.methods.participantHasTicket(
            addressToCheck,
            event.id
          ).call({ from: accounts[0] });

          alert(
            result
              ? 'Given address is a valid participant.'
              : 'Given address is not a valid participant.'
          );
        } else {
          alert('Given address is not a valid address.');
        }
      }}>
        <Form.Group>
          <InputGroup>
            <InputGroup.Prepend>
              <InputGroup.Text><FaUser /></InputGroup.Text>
            </InputGroup.Prepend>
            <Form.Control
              required
              placeholder="Account address"
              className={classNames({
                'is-valid': addressToCheck.length > 0 && isAddressValid,
                'is-invalid': addressToCheck.length > 0 && !isAddressValid
              })}
              disabled={isValidatingAddress}
              value={addressToCheck}
              onChange={e => {
                const { value: addressToCheck } = e.target;

                this.setState({ addressToCheck }, () => {
                  this.setState({
                    isAddressValid: isAddress(this.state.addressToCheck)
                  });
                });
              }}
            />
            {
              (addressToCheck.length > 0 && !isAddressValid) && (
                <Form.Control.Feedback type="invalid">
                  Address is required and must be a valid address.
                </Form.Control.Feedback>
              )
            }
          </InputGroup>
        </Form.Group>
        <Button
          variant="primary"
          type="submit"
          block
          disabled={isValidatingAddress}
        >
          Check
        </Button>
      </Form>
    );
  };

  renderWithdraw = () => {
    const {
      event,
      isWithdrawalSucceed,
      isWithdrawing
    } = this.state;

    const canWithdraw = event ? event.ended : false;
    const hasMoneyToWithdraw = event ? event.hasMoneyToWithdraw : false;

    let message;

    if (isWithdrawing) {
      message = isWithdrawalSucceed
        ? (<p>Money withdrawn! Check your balance.</p>)
        : (<p>Withdrawing money...</p>);
    } else {
      if (canWithdraw) {
        if (hasMoneyToWithdraw) {
          message = (
            <p>
              {`Are you sure you want to withdraw money from `}
              <strong>{event.name}</strong>
              {`?`}
            </p>
          );
        } else {
          message = (<p>There are no money to withdraw.</p>);
        }
      } else {
        message = (
          <p>You can withdraw money after the event ended.</p>
        );
      }
    }

    return (
      <div className="mt-2">
        {message}
        {
          (
            (canWithdraw && hasMoneyToWithdraw) &&
            !isWithdrawalSucceed
          ) && (
            <Button
              variant="primary"
              block
              disabled={isWithdrawing}
              onClick={() => {
                this.withdraw(event);
              }}
            >
              {
                isWithdrawing ? <Spinner animation="border" /> : 'Withdraw'
              }
            </Button>
          )
        }
      </div>
    );
  };

  render() {
    const {
      onHide = () => {},
      show = false
    } = this.props;

    const {
      activeTab,
      event,
      isWithdrawalSucceed,
      isWithdrawing,
      loaded
    } = this.state;

    return (
      <Modal
        show={show}
        onHide={() => {
          this.setState({
            activeTab: 'check',
            addressToCheck: '',
            event: null,
            isAddressValid: false,
            isValidatingAddress: false,
            isWithdrawalSucceed: false,
            isWithdrawing: false,
            loaded: false
          }, () => {
            onHide();
          });
        }}
        backdrop="static"
        keyboard={false}
        centered
      >
        <Modal.Header closeButton={!isWithdrawing || isWithdrawalSucceed}>
          <Modal.Title>
            {loaded ? event.name : 'Loading...'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {
            loaded ? (
              <Tabs
                id="my-events-modal-tab"
                activeKey={activeTab}
                onSelect={tab => {
                  this.setState({ activeTab: tab });
                }}
              >
                <Tab eventKey="check" title="Check a participant">
                  {this.renderCheck()}
                </Tab>
                <Tab eventKey="withdrawal" title="Withdrawal">
                  {this.renderWithdraw()}
                </Tab>
              </Tabs>
            ) : (
              <div className="d-flex justify-content-center">
                <Spinner animation="border" />
              </div>
            )
          }
        </Modal.Body>
      </Modal>
    );
  }
}

export default WithdrawalForm;
