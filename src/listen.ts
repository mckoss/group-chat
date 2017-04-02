//
// Listen.ts - Generic interfaces for listening to a changing value.
//

// A listen function establishes a binding to a Listener function.
// It returns a function to detach (unlisten).
export type Listen<T> = (listener: Listener<T>) => Unlisten;
export type Unlisten = () => void;

// A Listener receives calls when new values are present.
export type Listener<T> = (value: T, err?: Error) =>  void;

export interface Listenable<T> {
  listen: Listen<T>;
}
