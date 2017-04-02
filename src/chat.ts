import { config } from './config';

//
// The <App> UI is bound to a property which implements this interface.
//
export interface App {
  rooms: Room[];
  currentRoom: Room | null;
}

export interface Room {
  name: string;
  messages: Message[];

  addMessage: (message: Message) => void;
}

export interface Message {
  from: string;
  when: number;
  message: string;
};

//
// Implementation of Application using Firebase.
//
export class AppOnFirebase implements App {
  rooms: Room[] = [];
  currentRoom: Room | null = null;

  private fbApp: firebase.app.App;

  constructor() {
    console.log("Application startup ...");
    if (typeof firebase === 'undefined') {
      console.error("Firebase script not loaded - offline?");
    } else {
      this.fbApp = firebase.initializeApp(config);
    }
  }

  createRoom(name: string): Room {
    let room = new RoomImpl(name);

    this.rooms.push(room);
    this.currentRoom = room;
    return room;
  }
}

export class RoomImpl implements Room {
  messages: Message[] = [];

  constructor(public name: string) {/*_*/}

  addMessage(message: Message) {
    this.messages.push(message);
  }
}
