import { config } from './config';
import { Listen, Listenable, Listener, Unlisten } from './listen';

//
// The <App> UI is bound to a property which implements this interface.
//
export interface AppState {
  nickname: string;
  rooms: Room[];
  currentRoom: Room | null;
  latestError: string;
}

export interface App extends Listenable<AppState> {
  getState: () => AppState;
  createRoom: (name: string) => void;
  selectRoom: (room: Room) => void;
  setNickname: (name: string) => void;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

export interface Room {
  name: string;
  // TODO(koss): Add room-specific nickname.
  rid: string;
  role: string;
  messages: Message[];

  sendMessage: (message: string) => void;
}

export interface Message {
  from: string;
  when: number;
  message: string;
};

//
// Firebase datamodel
//
export interface RoomInfo {
  private: boolean;
  name: string;
}

type Role = 'unknown' | 'owner' | 'applicant' | 'member' | 'banned';
export interface Member {
  nickname: string;
  role: Role;
}

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

    window.addEventListener('error', (e) => {
      this.displayError(e as any as Error);
    });

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

      // TODO(koss): Use child_added instead.
      this.app.database().ref('rooms').on('value', (snapshot) => {
        if (!snapshot) {
          return;
        }
        let rooms = snapshot.val() as {[rid: string]: RoomInfo};

        if (!rooms) {
          this.state.rooms = [];
          return;
        }

        this.state.rooms = Object.keys(rooms).map((rid) => {
          return new RoomImpl(this, rid, rooms[rid]);
        });
        // TODO(koss): Update role from /members list.
        this.updateListeners();
      });

    }
    this.state = {
      nickname: 'anonymous',
      rooms: [],
      currentRoom: null,
      latestError: ''
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

  getState(): AppState {
    return Object.assign({}, this.state);
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
          this.listener(this.getState());
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
    if (room) {
      this.state.currentRoom = room;
      this.updateListeners();
    }
  }

  findRoom(rid: string): Room | null {
    for (let room of this.state.rooms) {
      if (room.rid === rid) {
        return room;
      }
    }
    return null;
  }

  createRoom(name: string) {
    this.ensureSignedIn("create a room");

    let ref = this.app.database().ref('rooms').push();

    let roomInfo: RoomInfo = {
      private: true,
      name: name
    };

    ref.set(roomInfo)
      .then(() => {
        let member: Member = {
          nickname: this.state.nickname,
          role: 'owner',
        };
        return this.app.database().ref('members')
          .child(ref.key!)
          .child(this.uid)
          .set(member);
      })
      .then(() => {
        let room = this.findRoom(ref.key!);
        if (!room) {
          throw new Error("Can't select room: " + ref.key);
        }
        this.selectRoom(room);
      })
      .catch((error) => this.displayError(error));
  }

  ensureSignedIn(reason: string) {
    if (!this.uid) {
      throw new Error("Must be siged in to " + reason + ".");
    }
  }

  displayError(error: Error) {
    console.log(error);
    this.state.latestError = error.message;
    this.updateListeners();
  }
}

export class RoomImpl implements Room {
  name: string;
  rid: string;
  role: string;
  messages: Message[] = [];

  constructor(private app: AppOnFirebase,
              rid: string,
              info: RoomInfo) {
    this.name = info.name;
    this.rid = rid;
    this.role = 'unknown';
  }

  sendMessage(message: string) {
    this.messages.push({
      from: this.app.state.nickname,
      when: Date.now(),
      message: message
    });
    this.app.updateListeners();
  }
}
