import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Room } from './chat-model';
import { MessageEl, RoomEl } from './chat';

import { config } from './config';

window.addEventListener('load', init);

let app: firebase.app.App;

function init() {
  console.log("Application startup ...");

  let sample = new Room("Example room");
  sample.add({from: "Mike", when: 123, message: "Hello, world!"});
  sample.add({from: "Deb", when: 124, message: "Hi, back."});

  ReactDOM.render(
      <RoomEl {...sample} />,
      document.getElementById('room')
  );

  app = firebase.initializeApp(config);
  console.log(app);
}
