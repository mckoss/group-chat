import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Room, App } from './chat';
import { AppEl } from './chat-elems';


window.addEventListener('load', init);

function init() {
  let app = new App();
  let sample = app.createRoom("Example room");

  sample.add({from: "Mike", when: 123, message: "Hello, world!"});
  sample.add({from: "Deb", when: 124, message: "Hi, back."});

  ReactDOM.render(
      <AppEl {...app} />,
      document.getElementById('app')
  );
}
