import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Room, App, AppOnFirebase } from './chat';
import { AppEl } from './chat-elems';


window.addEventListener('load', init);

function init() {
  let app = new AppOnFirebase();
  let room = app.createRoom("Example room");

  room.sendMessage("Hello, world!");
  room.sendMessage("Hi, back.");
  room.sendMessage("Hello, again!");

  ReactDOM.render(
      <AppEl app={app} />,
      document.getElementById('app')
  );
}
