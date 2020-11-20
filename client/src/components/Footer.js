import React, { Component } from 'react';

class Footer extends Component {
  render() {
    return (
      <footer>
        <hr />
        <p className="text-center">
          Created by {
            <a
              href="https://rymanalu.github.io/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Roni Yusuf
            </a>
          }
        </p>
      </footer>
    );
  }
}

export default Footer;
