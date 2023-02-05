declare module "component-tree" {
    export default ComponentTree;
    export type Interpreter = import("../node_modules/xstate/lib/index").AnyInterpreter;
    export type Event = import("../node_modules/xstate/lib/index").EventObject;
    export type SendActionOptions = import("xstate").SendActionOptions<any, any>;
    export type State = import("../node_modules/xstate/lib/index").AnyState;
    export type Matches = (path: string) => boolean;
    export type Can = (event: Event | string) => boolean;
    export type HasTag = (tag: string) => boolean;
    export type Subscriber = () => Result;
    export type Unsubscriber = () => void;
    export type Result = {
        tree: any[];
        state: import("xstate").State<any, any, any, any, any>;
        matches: Matches;
        can: Can;
        hasTag: HasTag;
    };
    class ComponentTree {
        /**
         * @class
         * @param {Interpreter} service The xstate Interpreter root instance to monitor
         * @param {Subscriber | undefined} callback The function to call when updated component trees are generated
         * @param {object} options Configuration
         * @param {boolean?} options.cache If true, will cache the result of dynamic component & prop functions
         * @param {boolean?} options.stable When true statechart keys will be sorted to ensure stable component output order
         * @param {boolean?} options.verbose When true runtime debugging output will be logged
         */
        constructor(service: import("xstate").AnyInterpreter, callback: Subscriber | undefined, options?: {
            cache: boolean | null;
            stable: boolean | null;
            verbose: boolean | null;
        });
        id: string;
        _options: {
            cache: boolean;
            stable: boolean;
            verbose: boolean;
            callback: Subscriber;
        };
        _services: Map<any, any>;
        _listeners: Set<any>;
        _cache: Map<any, any>;
        _paths: Map<any, any>;
        _invokables: Map<any, any>;
        _unsubscribes: Set<any>;
        _log: {
            (...data: any[]): void;
            (message?: any, ...optionalParams: any[]): void;
        };
        _boundApis: {
            matches: any;
            hasTag: any;
            can: any;
            broadcast: any;
        };
        _result: {
            matches: any;
            hasTag: any;
            can: any;
            broadcast: any;
            __proto__: any;
            tree: any[];
            state: import("xstate").State<any, any, any, any, any>;
        };
        _addService({ path, service, parent }: {
            path: any;
            service: any;
            parent?: boolean;
        }): void;
        _watch(path: any): void;
        _onState(path: any, state: any): void;
        _shouldRun(path: any, run: any): boolean;
        _run(path: any): any;
        _walk(path: any): Promise<any[]>;
        /**
         * Remove all subscribers and null out all properties
         */
        teardown(): void;
        /**
         * @callback Broadcast Send an event to the service and all its children
         * @param {Event | string} event XState event to send
         * @param {SendActionOptions} [options] XState options to send
         */
        broadcast(event: any, options: any): void;
        /**
         * Check if the current state or any child states have a tag set
         *
         * @type {HasTag}
         */
        hasTag(tag: string): boolean;
        /**
         * Check if the current state or any child states can make a transition
         *
         * @type {Can}
         */
        can(event: string | import("xstate").EventObject): boolean;
        /**
         * Check if the current state or any child states match a path
         *
         * @type {Matches}
         */
        matches(path: string): boolean;
        /**
         * Send an event to the root machine only
         *
         * @param {Event[]} event Event to send
         * @returns {State} Resulting state
         */
        send(...event: Event[]): import("xstate").AnyState;
        /**
         * Provides an observable API, matches the svelte store contract
         * https://svelte.dev/docs#component-format-script-4-prefix-stores-with-$-to-access-their-values-store-contract
         *
         * @param {Subscriber} callback function to be called whenever a new tree is generated
         * @returns {Unsubscriber} Unsubscribe function
         */
        subscribe(callback: Subscriber): Unsubscriber;
    }
}
