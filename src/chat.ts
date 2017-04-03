import { config } from './config';
import { Listen, Listenable, Listener, Unlisten } from './listen';

//
// The <App> UI is bound to a property which implements this interface.
//
export interface AppState {
  nickname: string;
  rooms: Room[];
  currentRoom: Room | null;
}

export interface App extends Listenable<AppState> {
  createRoom: (name: string) => Room;
  selectRoom: (room: Room) => void;
  setNickname: (name: string) => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export interface Room {
  name: string;
  messages: Message[];

  sendMessage: (message: string) => void;
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
  state: AppState;
  listener: Listener<AppState>;

  private app: firebase.app.App;
  private uid: string;
  private pendingUpdate = false;

  constructor() {
    console.log("Application startup ...");
    if (typeof firebase === 'undefined') {
      console.error("Firebase script not loaded - offline?");
    } else {
      this.app = firebase.initializeApp(config);
      this.app.auth().onAuthStateChanged((user: firebase.User | null) => {
        if (user === null) {
          delete this.uid;
          this.setNickname('anonymous');
          return;
        }
        this.uid = user.uid;
        if (user.displayName) {
          this.setNickname(user.displayName);
        }
      });
    }
    this.state = {
      nickname: 'anonymous',
      rooms: [],
      currentRoom: null,
    };
  }

  // TODO(koss): Allow more than one listener.
  listen(listener: Listener<AppState>): Unlisten {
    this.listener = listener;
    this.updateListeners();
    return (() => {
      delete this.listener;
    });
  }

  updateListeners() {
    if (this.pendingUpdate) {
      return;
    }
    this.pendingUpdate = true;
    Promise.resolve()
      .then(() => {
        this.pendingUpdate = false;
        if (this.listener) {
          this.listener(this.state);
        }
      });
  }

  signIn(): Promise<void> {
    let provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    provider.addScope('https://www.googleapis.com/auth/plus.login');
      // signInWithPopup does not work on mobile devices
    return this.app.auth().signInWithRedirect(provider) as Promise<void>;
  }

  signOut(): Promise<void> {
    return this.app.auth().signOut() as Promise<void>;
  }

  setNickname(name: string) {
    this.state.nickname = name;
    this.updateListeners();
  }

  selectRoom(room: Room) {
    console.log('select', room.name);
    this.state.currentRoom = room;
    this.updateListeners();
  }

  createRoom(name: string): Room {
    let room = new RoomImpl(this, name);

    this.state.rooms.push(room);
    this.state.currentRoom = room;

    this.updateListeners();

    return room;
  }
}

export class RoomImpl implements Room {
  messages: Message[] = [];

  constructor(private app: AppOnFirebase,
              public name: string) {/*_*/}

  sendMessage(message: string) {
    this.messages.push({
      from: this.app.state.nickname,
      when: Date.now(),
      message: message
    });
    this.app.updateListeners();
  }
}
