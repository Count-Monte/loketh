import React, { Component, Fragment } from 'react';
import { Button, Modal, Spinner } from 'react-bootstrap';

import { handleError, toEvent } from '../utils';

class WithdrawalForm extends Component {
  state = {
    event: null,
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

  render() {
    const {
      onHide = () => {},
      show = false
    } = this.props;

    const {
      event,
      isWithdrawalSucceed,
      isWithdrawing,
      loaded
    } = this.state;

    const spinner = (<Spinner animation="border" />);

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
      <Modal
        show={show}
        onHide={() => {
          this.setState({
            event: null,
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
          <Modal.Title>Withdraw Money</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {
            loaded ? (
              <Fragment>
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
                        isWithdrawing ? spinner : 'Withdraw'
                      }
                    </Button>
                  )
                }
              </Fragment>
            ) : (
              <div className="d-flex justify-content-center">
                {spinner}
              </div>
            )
          }
        </Modal.Body>
      </Modal>
    );
  }
}

export default WithdrawalForm;
