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
    this.currentRoom = {
      name: name,
      messages: [],
    };

    this.rooms.push(this.currentRoom);
    return this.currentRoom;
  }

  addMessage(message: Message) {
    if (this.currentRoom) {
      this.currentRoom.messages.push(message);
    }
  }
}
