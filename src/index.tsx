import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Room, App, AppOnFirebase } from './chat';
import { AppEl } from './chat-elems';


window.addEventListener('load', init);

function init() {
  let app = new AppOnFirebase();
  app.createRoom("Example room");

  app.addMessage({from: "Mike", when: 123, message: "Hello, world!"});
  app.addMessage({from: "Deb", when: 124, message: "Hi, back."});
  app.addMessage({from: "Mike", when: 123, message: "Hello, again!"});

  ReactDOM.render(
      <AppEl app={app} />,
      document.getElementById('app')
  );
}
