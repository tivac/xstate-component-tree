declare type ComponentAndProps = module;

declare type State = module;

declare type Result = any;

/**
 * @param service - The xstate Interpreter root instance to monitor
 * @param callback - The function to call when updated component trees are generated
 * @param options - Configuration
 * @param options.cache - If true, will cache the result of dynamic component & prop functions
 * @param options.stable - When true statechart keys will be sorted to ensure stable component output order
 * @param options.verbose - When true runtime debugging output will be logged
 */
declare class ComponentTree {
    constructor(service: Interpreter, callback: Subscriber | undefined, options: {
        cache: boolean;
        stable: boolean;
        verbose: boolean;
    });
    /**
     * Remove all subscribers and null out all properties
     */
    teardown(): void;
    /**
     * Check if the current state or any child states have a tag set
     */
    hasTag(): void;
    /**
     * Check if the current state or any child states can make a transition
     */
    can(): void;
    /**
     * Check if the current state or any child states match a path
     */
    matches(): void;
    /**
     * Send an event to the root machine only
     * @param event - Event to send
     * @returns Resulting state
     */
    send(...event: Event[][]): State;
    /**
     * Provides an observable API, matches the svelte store contract
    https://svelte.dev/docs#component-format-script-4-prefix-stores-with-$-to-access-their-values-store-contract
     * @param callback - function to be called whenever a new tree is generated
     * @returns Unsubscribe function
     */
    subscribe(callback: Subscriber): Unsubscriber;
}

/**
 * @param event - XState event to send
 * @param [options] - XState options to send
 */
declare type Broadcast = (event: Event | string, options?: SendActionOptions) => void;

