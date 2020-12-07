import React, { Component } from 'react';

class ATargetBlank extends Component {
  render() {
    const { children, ...newProps } = this.props;

    return (
      <a
        {...newProps}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  }
}

export default ATargetBlank;
