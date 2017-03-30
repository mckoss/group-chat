import { config } from './config';

export class App {
  app: firebase.app.App;
  rooms: Room[] = [];
  current: Room;

  constructor() {
    console.log("Application startup ...");
    this.app = firebase.initializeApp(config);
  }

  createRoom(name: string): Room {
    this.current = new Room(name);
    this.rooms.push(this.current);
    return this.current;
  }
}

export class Room {
  messages: Message[];

  constructor(
    public name: string) {
    this.messages = [];
  }

  add(m: Message) {
    this.messages.push(m);
  }
};

export interface Message {
  from: string;
  when: number;
  message: string;
};
