import React, { Component } from 'react';

class IconWithText extends Component {
  render() {
    const { icon: Icon } = this.props;

    return (
      <template style={{ display: 'flex', alignItems: 'center' }}>
        <Icon />&nbsp;{this.props.children}
      </template>
    );
  }
}

export default IconWithText;
