import * as React from 'react';

import { Unlisten } from './listen';
import { App, AppState, Room, Message } from './chat';
import { Age } from './format';
import { InputEl } from './input';

export class AppEl extends React.Component<{app: App}, AppState> {
  unlisten: Unlisten;

  constructor(props: {app: App}) {
    super(props);
    this.state = props.app.getState();
  }

  componentDidMount() {
    this.unlisten = this.props.app.listen((state: AppState) => {
      this.setState(state || {});
    });
  }

  componentWillUnmount() {
    this.unlisten();
  }

  render() {
    return (
      <div className="app">
        {this.state.latestError !== '' ?
          <div id="error">{this.state.latestError}</div> : ''}
        <div>Nickname: {this.state.nickname}</div>
        <InputEl onSubmit={(value) => this.props.app.setNickname(value)}
                 placeholder="Set nickname ..." />
        <input type="button"
               onClick={() => this.props.app.signIn()}
               value="Sign In" />
        <input type="button"
               onClick={() => this.props.app.signOut()}
               value="Sign Out" />
        <h2>Rooms:</h2>
        <ul className="room-list">
          {this.state.rooms.map((room) => {
            return (<li key={room.rid}
                    className={this.state.currentRoom === room ? 'selected' : ''}
                        onClick={() => this.props.app.selectRoom(room)}>
                      {room.name}
                      {room.role === '' ? '' : ' (' + room.role +
                                               ' as ' + room.nickname + ')'}
                      {room.role === 'owner' ?
                        <input type="button"
                               onClick={() => this.props.app.deleteRoom(room)}
                               value="Delete" /> : ''}
                    </li>);
          })}
        </ul>

        <InputEl onSubmit={(value) => this.props.app.createRoom(value)}
                 placeholder="Room name to create ..." />

        <hr />

        {this.state.currentRoom ?
         <RoomEl room={this.state.currentRoom} /> :
         <div>No selected room.</div>
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
        <InputEl onSubmit={(value) => this.props.room.sendMessage(value)}
                 size={64}
                 placeholder="Enter message ..." />
      </div>);
  }
}

export class MessageEl extends React.Component<Message, undefined> {
  render() {
    return (
      <div className="message">
        <span className="user">{this.props.from}</span>: {this.props.message}
        <div className="when">
          <Age timestamp={this.props.when} />
        </div>
      </div>
    );
  }
}
