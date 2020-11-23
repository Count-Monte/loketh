import React, { Component, Fragment } from 'react';

import { Pagination as BasePagination } from 'react-bootstrap';

class Pagination extends Component {
  render() {
    const {
      from = 0,
      hasPrev = false,
      hasNext = false,
      onClickPrev = () => {},
      onClickNext = () => {},
      to = 0,
      total = 0
    } = this.props;

    return (
      <Fragment>
        <BasePagination className="d-flex justify-content-center mt-4">
          {
            hasPrev && (
              <BasePagination.Prev onClick={onClickPrev} />
            )
          }
          {
            hasNext && (
              <BasePagination.Next onClick={onClickNext} />
            )
          }
        </BasePagination>
        <p className="text-center">
          Showing {from} to {to} of {total} events
        </p>
      </Fragment>
    );
  }
}

export default Pagination;
