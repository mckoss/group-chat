import * as React from 'react';

import { Message, Room } from './chat-model';

export class MessageEl extends React.Component<Message, undefined> {
  render() {
    return (
      <div className="message">
        {this.props.from}: {this.props.message}
      </div>
    );
  }
}

export class RoomEl extends React.Component<Room, undefined> {
  render() {
    return (
      <div className="room">
        <h1>{this.props.name}</h1>
        {this.props.messages.map((message) => <MessageEl {...message} />)}
      </div>)
  }
}
