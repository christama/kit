/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

// Global event emitter for the entire kit

import { globalLogger } from './Logger';

const log = globalLogger.createChild('EventEmitter');

export type EventPayload = object;

export interface KitEvent<T extends EventPayload = EventPayload> {
    type: string;
    payload: T;
    source?: string;
    timestamp: number;
}

export type EventListener<T extends EventPayload = EventPayload> = (event: KitEvent<T>) => void | Promise<void>;

/**
 * Global event emitter for the TonWalletKit
 * Allows components to send and receive events throughout the kit.
 */
export class EventEmitter<Events extends { [K in keyof Events]: EventPayload }> {
    private listeners: Map<keyof Events, Set<EventListener>> = new Map();
    // private listeners = new Map<keyof Events, Set<unknown>>();

    /**
     * Subscribe to an event.
     * Returns an unsubscribe function.
     */
    on<K extends keyof Events>(eventName: K, listener: EventListener<Events[K]>): () => void {
        if (!this.listeners.has(eventName)) {
            this.listeners.set(eventName, new Set());
        }

        const eventListeners = this.listeners.get(eventName)!;

        eventListeners.add(listener as EventListener);
        log.debug('Event listener added', {
            eventName: String(eventName),
            totalListeners: eventListeners.size,
        });

        return () => this.off(eventName, listener);
    }

    /**
     * Subscribe to an event once (automatically removes after first emission).
     * Returns an unsubscribe function.
     */
    once<K extends keyof Events>(type: K, listener: EventListener<Events[K]>): () => void {
        const wrapper = (event: KitEvent<Events[K]>) => {
            this.off(type, wrapper);
            listener(event);
        };

        return this.on(type, wrapper);
    }

    /**
     * Unsubscribe from an event
     */
    off<K extends keyof Events>(type: K, listener: EventListener<Events[K]>): void {
        this.listeners.get(type)?.delete(listener as EventListener);
    }

    /**
     * Emit an event to all subscribers.
     */
    emit<K extends keyof Events>(eventName: K, payload: Events[K], source: string): void {
        const event: KitEvent<Events[K]> = {
            type: eventName as string,
            timestamp: Date.now(),
            source,
            payload,
        };

        const listeners = this.listeners.get(eventName);

        if (listeners) {
            listeners.forEach((listener) => {
                (listener as EventListener<Events[K]>)(event);
            });
        }
    }

    /**
     * Remove all listeners for a specific event or all events
     */
    removeAllListeners(eventName?: keyof Events): void {
        if (eventName) {
            this.listeners.delete(eventName);
            log.debug('All listeners removed for event', { eventName: String(eventName) });
        } else {
            this.listeners.clear();
            log.debug('All event listeners cleared');
        }
    }

    /**
     * Get the number of listeners for an event
     */
    listenerCount(eventName: keyof Events): number {
        return this.listeners.get(eventName)?.size || 0;
    }

    /**
     * Get all event names that have listeners
     */
    eventNames(): string[] {
        return Array.from(this.listeners.keys()).map((k) => String(k));
    }
}

// EventEmitter class - each kit instance will create its own instance
