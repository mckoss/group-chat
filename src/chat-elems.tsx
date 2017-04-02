import * as React from 'react';

import { App, Room, Message } from './chat';

export class AppEl extends React.Component<{app: App}, undefined> {
  render() {
    return (
      <div className="app">
        {this.props.app.currentRoom ?
         <RoomEl room={this.props.app.currentRoom} /> :
         <div>No current room!</div>
        }
      </div>
    );
  }
}

export class RoomEl
extends React.Component<{room:Room}, undefined> {
  render() {
    let key = 0;
    return (
      <div className="room">
        <h1>{this.props.room.name}</h1>
        {this.props.room.messages.map((message) => {
          return <MessageEl key={key++} {...message} />;
        })}
        <input id="message" type="text" />
        <input type="button" value="Send" onClick={() => this.doClick()}/>
      </div>);
  }

  doClick() {
    this.props.room.addMessage({
      from: "mike",
      when: 123,
      message: this.refs.message.value});
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
