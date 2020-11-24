import React, { Component } from 'react';

class IconWithText extends Component {
  render() {
    const { children, icon: Icon } = this.props;

    return (
      <template style={{ display: 'flex', alignItems: 'center' }}>
        <Icon />&nbsp;{children}
      </template>
    );
  }
}

export default IconWithText;
