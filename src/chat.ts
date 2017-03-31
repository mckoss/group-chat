import { config } from './config';

//
// Plain Javascript objects define the types for props that can be used in
// React components.
//
export class App {
  rooms: Room[];
  currentRoom: Room | null;
}

export class Room {
  name: string;
  messages: Message[];
}

export class Message {
  from: string;
  when: number;
  message: string;
};

//
// Implementation of Application using Firebase.
//
export class AppImpl {
  private app: App;
  private fbApp: firebase.app.App;

  constructor() {
    console.log("Application startup ...");
    this.fbApp = firebase.initializeApp(config);
    this.app = {
      rooms: [],
      currentRoom: null
    };
  }

  get props(): App {
    return this.app;
  }

  createRoom(name: string): Room {
    this.app.currentRoom = {
      name: name,
      messages: [],
    };

    this.app.rooms.push(this.app.currentRoom);
    return this.app.currentRoom;
  }

  addMessage(message: Message) {
    if (this.app.currentRoom) {
      this.app.currentRoom.messages.push(message);
    }
  }
}
