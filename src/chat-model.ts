export interface Message {
  from: string;
  when: number;
  message: string;
};

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
