import * as React from 'react';

import { App, Room, Message } from './chat';

export class AppEl extends React.Component<App, undefined> {
  render() {
    return (
      <div className="app">
        {this.props.currentRoom ?
         <RoomEl {...this.props.currentRoom} /> :
         <div>No current room!</div>
        }
      </div>
    );
  }
}

export class RoomEl extends React.Component<Room, undefined> {
  render() {
    let key = 0;
    return (
      <div className="room">
        <h1>{this.props.name}</h1>
        {this.props.messages.map((message) => {
          return <MessageEl key={key++} {...message} />;
        })}
      </div>);
  }
}

export class MessageEl extends React.Component<Message, undefined> {
  render() {
    return (
      <div className="message">
        {this.props.from}: {this.props.message}
      </div>
    );
  }
}
