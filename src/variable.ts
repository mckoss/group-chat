/*
 * A Variable is an asynchronous changing-value.  When a value is available
 * from a Variable, it will emit the value via callbacks registered with it's
 * listen() method.  The listener should NOT mutate the value emited by the
 * Variable as it is shared across all listeners.
 *
 * Adding a listener to a Variable that has already emitted a value is guaranteed
 * to emit the previous (current) value of the Variable immediately to the
 * new listener.
 *
 * If you want a Variable to emit  an "empty" value, it is suggested that you
 * emit a null value, whereas an "unavailable" value would be emitted as
 * undefined).
 *
 * You can clean up all resources when the last listener unsubscribes by
 * implementing attached an onClosed listener.
 *
 * The order of calling functions has been carefully crafted to reduce
 * spurious undefined values:
 *
 * The Executor is called synchronously.  Any values it emits on that call
 * will be the initial value of the Listenable.
 *
 * Attached Listeners are alwasy called asynchronously.
 *
 * TODO(koss): Remove the unlisten parameter from the listener callback.
 */
import {Listenable, Listener, Unlisten} from './listen';

export type Emit<T> = (value: T | undefined, err?: Error) => void;
export type Executor<T> = (emit: Emit<T>) => void;
export type Option<T> = T | Promise<T> | Listenable<T>;
export type OnError = (err: Error) => void;
export type Fn<T> = (...args: any[]) => T;

type Map<T> = {[prop: string]: T};

const microQueue = Promise.resolve();

export class Variable<T> implements Listenable<T> {
  private value_: T;
  private hasEmitted = false;

  private listeners_: (Listener<T> | undefined)[] = [];
  private unlistens_: (Unlisten | undefined)[] = [];
  private onOpenListener: (emit: Emit<T>) => void;
  private onClosedListener: () => void;
  private listenerCount = 0;

  private closed_: Promise<void>;
  private resolveClosed: () => void;
  private emit: Emit<T>;

  constructor(executor: Executor<T>) {
    if (typeof executor !== 'function') {
      throw new Error("Missing executor function in Variable constructor.");
    }

    this.closed_ = new Promise<void>((resolve)  => {
      this.resolveClosed = resolve;
    });

    this.emit = (v: T, err?: Error) => {
      this.checkClosed_('emit');
      // Optimization - de-bounce emitted values that have not changed.
      if (this.hasEmitted && err === undefined &&
          (typeof v !== 'object' || v === null) &&
          this.value_ === v) {
        return;
      }
      this.hasEmitted = true;
      this.value_ = v;

      for (let i = 0; this.listeners_ && i < this.listeners_.length; i++) {
        this.callListener_(i, v, err);
      }
    };

    executor(this.emit);
  }

  listen(listener: Listener<T>): Unlisten {
    if (listener === undefined) {
      throw new Error("Missing listener function.");
    }
    this.checkClosed_('listen');

    if (this.listenerCount === 0) {
      if (this.onOpenListener) {
        this.onOpenListener(this.emit);
      }
    }
    this.listenerCount += 1;

    let i = this.listeners_.length;
    this.listeners_.push(listener);
    this.unlistens_.push((): void => {
      // Unlisten calls are idempotent
      if (this.listeners_ === undefined || this.listeners_[i] === undefined) {
        return;
      }
      this.listenerCount -= 1;
      this.listeners_[i] = undefined;
      this.unlistens_[i] = undefined;
      this.checkZeroListeners_();
    });

    this.callListener_(i, this.value_);

    return (this.unlistens_[i] as Unlisten);
  }

  private callListener_(i: number, v: T, err?: Error): void {
    if (!this.listeners_[i]) {
      return;
    }
    microQueue
      .then(() => {
        if (this.listeners_ && this.listeners_[i] !== undefined) {
          (this.listeners_[i] as Listener<T>)(v, err);
        }
      })
      .catch((e) => {
        console.log("Listener exception: " + e);
        if (e.stack) {
          console.log(e.stack);
        }
      });
  }

  get closed(): Promise<void> {
    return this.closed_;
  }

  onOpen(fn: (emit: Emit<T>) => void) {
    if (this.onOpenListener) {
      throw new Error("Variable supports at most one onOpen((emit) => {...}) call.");
    }
    this.onOpenListener = fn;
  }

  // Synchronous call as soon soon as the Variable is closed (i.e., has
  // zero listeners).
  onClosed(fn: () => void): void {
    if (this.onClosedListener) {
      throw new Error("Variable supports at most one onClosed() call.");
    }
    this.onClosedListener = fn;
  }

  private checkZeroListeners_() {
    if (this.listenerCount > 0) {
      return;
    }
    delete this.listeners_;
    delete this.unlistens_;

    if (this.onClosedListener) {
      this.onClosedListener();
      delete this.onClosedListener;
    }
    this.resolveClosed();
  }

  private checkClosed_(reason: string): void {
    if (this.listeners_ === undefined) {
      throw(new Error("Variable Error: Attempting to " + reason +
                      " to a closed Variable."));
    }
  }

  // Resolve when all arguments are resolved.  If any resolve as
  // undefined, all([args]) emits a single undefined value
  // instead of an array of the resolved values.
  // TODO: Handle Errors emitted in parts?
  static all(args: any[]): Variable<any[]> {
    let unresolved = args.length;
    let values = <any[]>[];
    let unlistens = <Unlisten[]>[];

    let results = new Variable<any[]>(
      (emit) => {
        function resolvePart(i: number, v: any) {
          if (values[i] === undefined && v !== undefined) {
            unresolved--;
          } else if (values[i] !== undefined && v === undefined) {
            unresolved++;
            // Emit undefined when first part becomes undefined.
            if (unresolved === 1) {
              emit(undefined);
            }
          }
          values[i] = v;
          if (unresolved === 0) {
            emit(values);
          }
        }

        for (let i = 0; i < args.length; i++) {
          let arg = args[i];
          if (hasMethod(arg, 'listen')) {
            unlistens[i] = (<Listenable<any>> arg).listen(resolvePart.bind(undefined, i));
          } else if (hasMethod(arg, 'then')) {
            (arg as Promise<any>).then(resolvePart.bind(undefined, i),
                                       resolvePart.bind(undefined, i, undefined));
          } else {
            resolvePart(i, arg);
          }
        }

        // No need to emit(undefined) during construction - because there are
        // no listeners yet - they'll get the intitial undefined when they attach.
      });

    results.onClosed(() => {
      if (unlistens) {
        unlistens.forEach((fn) => {
          try {
            fn();
          } catch (e) {
            // Do nothing.
          }
        });
        unlistens = [];
      }
    });

    return results;
  }

  // Emit the first (smallest index) of the parameters that has a defined
  // value (or undefined when none do).
  // TODO: How should emitted Errors be handled?
  static first(...args: any[]): Variable<any> {
    let values = <any[]>[];
    let unlistens = <Unlisten[]>[];

    let result = new Variable<any>(
      (emit) => {
        function resolvePart(i: number, v: any) {
          values[i] = v;
          for (let value of values) {
            if (value !== undefined) {
              emit(value);
              return;
            }
          }
          emit(undefined);
        }

        for (let i = 0; i < args.length; i++) {
          let arg = args[i];
          values[i] = undefined;
          if (hasMethod(arg, 'listen')) {
            unlistens[i] = (<Listenable<any>> arg).listen(resolvePart.bind(undefined, i));
          } else if (hasMethod(arg, 'then')) {
            (arg as Promise<any>).then(resolvePart.bind(undefined, i),
                                       resolvePart.bind(undefined, i, undefined));
          } else {
            resolvePart(i, arg);
          }
        }
      });

    result.onClosed(() => {
      if (unlistens !== undefined) {
        unlistens.forEach((fn) => {
          try {
            fn();
          } catch (e) {
            console.log("Unlisten from first exception: " + e);
            if (e.stack) {
              console.log(e.stack);
            }
          }
        });
        unlistens = [];
      }
    });

    return result;
  }

  // Converts a synchronous function to one allowing Listenables
  // as arguments and returning a Listenable value.
  //
  // If ANY function arguments are undefined, the function is not called (but
  // emits as a single undefined value).
  //
  // TODO(koss): If function returns Promise, or Variable, flatten the values
  // and just return the async values of each.
  static lift<R>(fn: (... args: any[]) => R,
                 name?: string): (... args: any[]) => Variable<R> {
    return function(... args: any[]): Variable<R> {
      args = copyArray(args);
      let unsubAll: Unlisten | undefined;
      let v = new Variable<R>(
        (emit) => {
          unsubAll = Variable.all(args)
            .listen((values) => {
              if (values === undefined) {
                emit(undefined);
                return;
              }
              try {
                let value = fn.apply(this, values);
                emit(value);
              } catch (e) {
                console.log("Exception in lift function: " + e);
                if (e.stack) {
                  console.log(e.stack);
                }
                emit(undefined, e);
              }
            });
        });
      v.onClosed(() => {
        if (unsubAll !== undefined) {
          unsubAll();
          unsubAll = undefined;
        }});
      return v;
    };
  }

  // Convert a Listenable to a one-shot Promise (resolved on first
  // value !== undefined).
  static next<R>(source: Listenable<R>): Promise<R> {
    return new Promise<R>((resolve, reject) => {
      let unlisten = source.listen((data, err) => {
        if (err !== undefined) {
          unlisten();
          reject(err);
        } else {
          if (data === undefined) {
            return;
          }
          unlisten();
          resolve(data);
        }
      });
    });
  }

  // Convert a Listenable to a one-shot Promise (resolved on first
  // value == undefined).
  static nextUndefined(source: Listenable<any>): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let unlisten = source.listen((data, err) => {
        if (err !== undefined) {
          unlisten();
          reject(err);
        } else {
          if (data !== undefined) {
            return;
          }
          unlisten();
          resolve();
        }
      });
    });
  }

  // Convert and of value<R>, Promise<R>, or Listenable<R> to a Variable<R>
  static option<R>(value: Option<R>): Variable<R> {
    return <Variable<R>> Variable.first(value);
  }

  // Convert an object of Listenable properties to a Listenable object of properties.
  // You can optionally pass in a results object which will be patched incrementally
  // as the child properties change.  This can be used to keep track of the latest
  // sycnhronous values from a collection of asyncrhonous values.
  //
  // Usage:
  //
  //   myObj = {};
  //   let v = Variable.collect({a: Variable, b: Variable}, myObj);
  //   ...
  //   v.release(); // Clean up when done.
  static collect(obj: Map<Option<any>>, results?: Map<any>)
  : Variable<Map<any>> {
    if (results === undefined) {
      results = {};
    }
    let props = Object.keys(obj);
    let unlisteners = <Map<Unlisten>>{};

    props.forEach((prop) => {
      results![prop] = undefined;
    });

    let result = new Variable<Map<any>>(
      (emit) => {
        props.forEach((prop) => {
          unlisteners[prop] = Variable.option(obj[prop])
            .listen((value) => {
              if (results![prop] !== value ||
                  (typeof value === 'object' && value !== null)) {
                results![prop] = value;
                emit(results);
              }
            });
        });
        emit(results);
      });
    result.onClosed(() => {
      props.forEach((prop) => {
        unlisteners[prop]();
      });
    });
    return result;
  }

  // Merging the results of each subsequent Listenable into a common stream.
  static flatten<U>(stream: Listenable<Listenable<U>>): Variable<U> {
    let unsub: Unlisten | undefined;
    let unsubSub: Unlisten | undefined;

    let result = new Variable<U>(
      (emit) => {
        unsub = stream.listen((subStream) => {
          if (unsubSub !== undefined) {
            unsubSub();
          }
          if (subStream === undefined) {
            emit(undefined);
            return;
          }
          unsubSub = subStream.listen((val) => {
            emit(val);
          });
        });
      });
    result.onClosed(() => {
      if (unsubSub) {
        unsubSub();
        unsubSub = undefined;
      }
      if (unsub) {
        unsub();
        unsub = undefined;
      }
    });
    return result;
  }

  // Asynchronously emit the values of an array as a Variable stream.
  // Don't start sending values until the first listener is attached.
  static fromArray<U>(a: Array<U>): Variable<U> {
    let i = 0;
    let result = new Variable<U>(() => {/*_*/});
    result.onOpen((emit) => {
      function next() {
        if (i < a.length) {
          emit(a[i++]);
          microQueue.then(next);
        }
      }
      next();
    });
    return result;
  }
}

// Has firebase semantics, not standard js.
export const getProp = Variable.lift((obj, prop) => {
  if (obj === undefined || prop === undefined || prop === null) {
    return undefined;
  }
  if (obj === null) {
    return null;
  }
  if (typeof(obj) !== 'object') {
    throw(new Error("Trying to get prop of non-object"));
  }
  return obj[prop];
}, 'getProp');

export const concat = Variable.lift((s1: string, s2: string) => {
  try {
    return s1.toString() + s2.toString();
  } catch (e) {
    return undefined;
  }
}, 'concat');

function copyArray(a: any): any[] {
  return Array.prototype.slice.call(a);
}

function hasMethod(obj: { [method: string]: any }, method: string): boolean {
  return typeof obj === 'object' && obj !== null && method in obj &&
    typeof obj[method] === 'function';
}

export function listp(l: Listenable<any>, s: string): Unlisten {
  return l.listen((val) => {
    console.log(s, val);
  });
}

// Create asynchronous version of a synchronous function.
// Use Promise for micro-task scheduling,
export function async<T>(fn: Fn<T>): Fn<Promise<T>> {
  return (...args: any[]): Promise<T> => {
    return microQueue
      .then(() => {
        return fn(...args);
      });
  };
}

// Call a (zero-argument) function after a delay (return result as a promise).
export function delay<T>(ms = 0, fn: () => T): Promise<T> {
  return new Promise<T>((resolve) => {
    setTimeout((): void => {
      resolve(fn());
    }, ms);
  });
}
