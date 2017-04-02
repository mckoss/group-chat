import * as React from 'react';
import * as ReactDOM from 'react-dom';

import { Room, App, AppOnFirebase } from './chat';
import { AppEl } from './chat-elems';


window.addEventListener('load', init);

function init() {
  let app = new AppOnFirebase();

  ReactDOM.render(
      <AppEl app={app} />,
      document.getElementById('app')
  );
}
