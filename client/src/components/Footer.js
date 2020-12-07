import React, { Component } from 'react';

import ATargetBlank from './ATargetBlank';

class Footer extends Component {
  render() {
    return (
      <footer>
        <hr />
        <p className="text-center">
          Created by {
            <ATargetBlank href="https://rymanalu.github.io/">
              Roni Yusuf
            </ATargetBlank>
          } &middot; {
            <ATargetBlank href="https://www.linkedin.com/in/roni-yusuf/">
              LinkedIn
            </ATargetBlank>
          } &middot; {
            <ATargetBlank href="https://github.com/rymanalu/loketh">
              Github
            </ATargetBlank>
          }
        </p>
      </footer>
    );
  }
}

export default Footer;
