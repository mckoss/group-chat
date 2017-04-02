import * as React from 'react';

import { Unlisten } from './listen';
import { App, AppState, Room, Message } from './chat';

export class AppEl extends React.Component<{app: App}, AppState> {
  unlisten: Unlisten;

  constructor(props: {app: App}) {
    super(props);
    this.state = {
      rooms: [],
      currentRoom: null,
    };
  }

  componentDidMount() {
    this.unlisten = this.props.app.listen((state: AppState) => {
      this.setState(state);
    });
  }

  componentWillUnmount() {
    this.unlisten();
  }

  render() {
    return (
      <div className="app">
        <h2>Rooms:</h2>
        <ul>
          {this.state.rooms.map((room) => {
            return (<li key={room.name}
                    className={this.state.currentRoom === room ? 'selected' : ''}
                        onClick={() => this.props.app.selectRoom(room)}>
                      {room.name}
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
        {this.props.from}: {this.props.message}
      </div>
    );
  }
}

//
// <InputEl /> - A generic text input field.
//
interface InputProps {
  enterText?: string;
  placeholder?: string;
  size?: number;
  onSubmit: (text: string) => void;
}

class InputEl extends React.Component<InputProps, {value: string}> {
  constructor(props: InputProps) {
    super(props);
    this.state = {
      value: ''
    };
  }

  render() {
    let self = this;

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      self.setState({value: e.target.value});
    }

    function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
      e.preventDefault();
      self.setState((prevState: {value: string}) => {
        self.props.onSubmit(prevState.value);
        return {
          value: ''
        };
      });
    }

    return (
      <form onSubmit={handleSubmit}>
        <input type="text"
               size={this.props.size || 32}
               placeholder={this.props.placeholder || ''}
               onChange={handleChange}
               value={this.state.value} />
        &nbsp;
        <button>{this.props.enterText || 'OK'}</button>
      </form>
    );
  }
}
