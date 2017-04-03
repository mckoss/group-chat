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
  rid: string;
  role: string;
  nickname: string;
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
export interface RoomData {
  private: boolean;
  name: string;
}

type Role = 'owner' | 'applicant' | 'member' | 'banned' | '';
export interface MemberData {
  nickname: string;
  role: Role;
}

//
// Implementation of Application using Firebase.
//
export class AppOnFirebase implements App {
  state: AppState;
  uid: string;
  listener: Listener<AppState>;

  private app: firebase.app.App;
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

      // Read and process each of the rooms.
      this.app.database().ref('rooms').on('child_added', (snapshot) => {
        let info = snapshot!.val()! as RoomData;
        let rid = snapshot!.key!;

        let room = this.findRoom(rid);

        if (room === null) {
          room = new RoomImpl(this, rid, info);
          this.state.rooms.push(room);
        };

        this.getMemberRef(rid)
          .once('value', (snapshot2) => {
            let member = snapshot2.val() as MemberData;
            if (member) {
              room!.nickname = member.nickname;
              room!.role = member.role;
              this.updateListeners();
            }
          })
          .catch((e) => this.displayError(e));

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

  selectRoom(room: RoomImpl) {
    if (room && room !== this.state.currentRoom) {
      this.state.currentRoom = room;
      room.listenForMessages();
      this.updateListeners();
    }
  }

  findRoom(rid: string): RoomImpl | null {
    for (let room of this.state.rooms) {
      if (room.rid === rid) {
        return room as RoomImpl;
      }
    }
    return null;
  }

  createRoom(name: string) {
    this.ensureSignedIn("create a room");

    let ref = this.app.database().ref('rooms').push();

    let roomInfo: RoomData = {
      private: true,
      name: name
    };

    ref.set(roomInfo)
      .then(() => {
        let member: MemberData = {
          nickname: this.state.nickname,
          role: 'owner',
        };
        return this.getMemberRef(ref.key!).set(member);
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

  getMemberRef(rid: string, uid?: string): firebase.database.Reference {
    if (!uid) {
      uid = this.uid;
    }
    return this.app.database().ref('members').child(rid).child(uid);
  }

  getMessagesRef(rid: string): firebase.database.Reference {
    return this.app.database().ref('messages').child(rid);
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
  nickname: string;
  messages: Message[] = [];
  hasMessage: {[rid: string]: boolean} = {};
  nicknameOf: {[uid: string]: string} = {};

  private messageQuery: firebase.database.Query;

  constructor(private app: AppOnFirebase,
              rid: string,
              info: RoomData) {
    this.name = info.name;
    this.rid = rid;
    this.role = '';
    this.nickname = app.state.nickname;
  }

  sendMessage(message: string) {
    this.app.ensureSignedIn('send a message');

    this.app.getMessagesRef(this.rid)
      .push({
        from: this.app.uid,
        when: firebase.database.ServerValue.TIMESTAMP,
        message: message
      });
  }

  listenForMessages() {
    if (this.messageQuery) {
      return;
    }
    // TODO(koss): Garbage collect message listener?
    this.messageQuery = this.app.getMessagesRef(this.rid).orderByKey();
    this.messageQuery.on('child_added', (snapshot) => {
      let message = snapshot!.val() as Message;
      console.log("message key", snapshot!.key!);
      this.ensureMessage(snapshot!.key!, message);
    });
  }

  ensureMessage(mid: string, message: Message) {
    if (this.hasMessage[mid]) {
      return;
    }
    let storedMessage = this.addMessage(mid, message);
    if (this.nicknameOf[message.from]) {
      // Re-write the from field to be the user's nickname.
      storedMessage.from = this.nicknameOf[message.from];
      this.app.updateListeners();
    } else {
      this.app.getMemberRef(this.rid, message.from).once('value', (snapshot) => {
        let member = snapshot.val() as MemberData;
        console.log("lookup of uid", mid, message.from, member.nickname);

        this.nicknameOf[message.from] = member.nickname;
        message.from = member.nickname;
        storedMessage.from = member.nickname;
        this.app.updateListeners();
      });
    }
  }

  addMessage(mid: string, message: Message): Message {
    this.messages.push(message);
    this.hasMessage[mid] = true;
    return this.messages.slice(-1)[0];
  }
}
