import React, { Component } from 'react';
import { Alert } from 'react-bootstrap';

import ATargetBlank from './ATargetBlank';

class LokethAlert extends Component {
  state = { show: true };

  render() {
    const { show } = this.state;

    return show && (
      <Alert
        variant="warning"
        className="mt-2"
        onClose={() => {
          this.setState({ show: false });
        }}
        dismissible
      >
        <Alert.Heading>Attention!</Alert.Heading>
        <p>
          Loketh is an experimental app. Please, do not create real transactions here. The author has no responsibility about any usage of this app.
        </p>
        <p className="mb-0">
          Hey, have no idea how to use this? <ATargetBlank href={process.env.REACT_APP_YOUTUBE_DEMO_LINK}>Check out my demo video on YouTube!</ATargetBlank>
        </p>
      </Alert>
    );
  }
}

export default LokethAlert;
