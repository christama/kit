/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { globalLogger } from '../core/Logger';
import type { StreamingProvider, StreamingProviderListener } from './StreamingProvider';
import { asAddressFriendly } from '../utils';

const log = globalLogger.createChild('WebsocketStreamingProvider');

export abstract class WebsocketStreamingProvider implements StreamingProvider {
    protected ws: WebSocket | null = null;
    protected isConnected = false;
    protected listener: StreamingProviderListener;

    private reconnectAttempts = 0;
    private maxReconnectAttempts = 3;
    private reconnectDelay = 300;
    private pingInterval: ReturnType<typeof setInterval> | null = null;
    private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    protected watchedBalance: Set<string> = new Set();
    protected watchedTransactions: Set<string> = new Set();
    protected watchedJettons: Set<string> = new Set();
    protected watchedTracesAddresses: Set<string> = new Set();
    protected watchedTraceHashes: Set<string> = new Set();

    constructor(listener: StreamingProviderListener) {
        this.listener = listener;
    }

    // Abstract methods to be implemented by children
    protected abstract getUrl(): string;
    protected abstract onMessage(event: MessageEvent): void;
    protected abstract updateSubscription(): void;
    protected abstract unsubscribe(addresses: string[], traceHashes: string[]): void;

    watchBalance(address: string): void {
        const friendly = asAddressFriendly(address);
        if (this.watchedBalance.has(friendly)) return;
        this.watchedBalance.add(friendly);
        this.ensureConnected();
    }

    unwatchBalance(address: string): void {
        const friendly = asAddressFriendly(address);
        if (!this.watchedBalance.has(friendly)) return;
        this.watchedBalance.delete(friendly);

        const isStillUsed =
            this.watchedTransactions.has(friendly) ||
            this.watchedJettons.has(friendly) ||
            this.watchedTracesAddresses.has(friendly);
        if (!isStillUsed) {
            this.unsubscribe([friendly], []);
        }

        this.checkClose();
    }

    watchTransactions(address: string): void {
        const friendly = asAddressFriendly(address);
        if (this.watchedTransactions.has(friendly)) return;
        this.watchedTransactions.add(friendly);
        this.ensureConnected();
    }

    unwatchTransactions(address: string): void {
        const friendly = asAddressFriendly(address);
        if (!this.watchedTransactions.has(friendly)) return;
        this.watchedTransactions.delete(friendly);

        const isStillUsed =
            this.watchedBalance.has(friendly) ||
            this.watchedJettons.has(friendly) ||
            this.watchedTracesAddresses.has(friendly);
        if (!isStillUsed) {
            this.unsubscribe([friendly], []);
        }

        this.checkClose();
    }

    watchJettons(address: string): void {
        const friendly = asAddressFriendly(address);
        if (this.watchedJettons.has(friendly)) return;
        this.watchedJettons.add(friendly);
        this.ensureConnected();
    }

    unwatchJettons(address: string): void {
        const friendly = asAddressFriendly(address);
        if (!this.watchedJettons.has(friendly)) return;
        this.watchedJettons.delete(friendly);

        const isStillUsed =
            this.watchedBalance.has(friendly) ||
            this.watchedTransactions.has(friendly) ||
            this.watchedTracesAddresses.has(friendly);
        if (!isStillUsed) {
            this.unsubscribe([friendly], []);
        }

        this.checkClose();
    }

    watchTraces(address: string): void {
        const friendly = asAddressFriendly(address);
        if (this.watchedTracesAddresses.has(friendly)) return;
        this.watchedTracesAddresses.add(friendly);
        this.ensureConnected();
    }

    unwatchTraces(address: string): void {
        const friendly = asAddressFriendly(address);
        if (!this.watchedTracesAddresses.has(friendly)) return;
        this.watchedTracesAddresses.delete(friendly);

        const isStillUsed =
            this.watchedBalance.has(friendly) ||
            this.watchedTransactions.has(friendly) ||
            this.watchedJettons.has(friendly);
        if (!isStillUsed) {
            this.unsubscribe([friendly], []);
        }

        this.checkClose();
    }

    watchTrace(hash: string): void {
        if (this.watchedTraceHashes.has(hash)) return;
        this.watchedTraceHashes.add(hash);
        this.ensureConnected();
    }

    unwatchTrace(hash: string): void {
        if (!this.watchedTraceHashes.has(hash)) return;
        this.watchedTraceHashes.delete(hash);
        this.unsubscribe([], [hash]);
        this.checkClose();
    }

    close(): void {
        this.stopReconnect();
        this.stopPing();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        log.info('WebsocketStreamingProvider disconnected');
    }

    protected checkClose(): void {
        if (
            this.watchedBalance.size === 0 &&
            this.watchedTransactions.size === 0 &&
            this.watchedJettons.size === 0 &&
            this.watchedTracesAddresses.size === 0 &&
            this.watchedTraceHashes.size === 0
        ) {
            this.close();
        }
    }

    protected ensureConnected(): void {
        if (this.isConnected || this.ws?.readyState === WebSocket.CONNECTING) {
            this.updateSubscription();
            return;
        }
        this.connect();
    }

    private connect(): void {
        this.stopReconnect();
        const url = this.getUrl();
        log.info('Connecting to WebSocket', { url: url.replace(/api_key=[^&]+/, 'api_key=***') });

        try {
            this.ws = new WebSocket(url);
        } catch (error) {
            log.error('WebSocket creation failed', { error });
            this.scheduleReconnect();
            return;
        }

        this.ws.onopen = () => {
            log.info('WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.updateSubscription();
            this.startPing();
        };

        this.ws.onmessage = this.onMessage.bind(this);

        this.ws.onclose = () => {
            log.info('WebSocket closed');
            this.isConnected = false;
            this.stopPing();
            this.ws = null;

            if (
                this.watchedBalance.size > 0 ||
                this.watchedTransactions.size > 0 ||
                this.watchedJettons.size > 0 ||
                this.watchedTracesAddresses.size > 0 ||
                this.watchedTraceHashes.size > 0
            ) {
                this.scheduleReconnect();
            }
        };
    }

    protected send(payload: unknown): void {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(payload));
        }
    }

    protected startPing(): void {
        this.stopPing();
        this.pingInterval = setInterval(() => {
            if (this.ws?.readyState === WebSocket.OPEN) {
                const message = this.getPingMessage();
                if (message) {
                    this.send(message);
                }
            }
        }, 15000); // 15s interval
    }

    protected stopPing(): void {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }

    protected scheduleReconnect(): void {
        if (this.reconnectTimeout) return;

        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            log.error('Max reconnect attempts reached, stopping reconnects');
            this.close();
            return;
        }

        this.reconnectAttempts++;
        const delayMs = Math.min(this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), 5000);
        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connect();
        }, delayMs);
    }

    protected stopReconnect(): void {
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    /**
     * Override to determine the ping payload sent every 15s.
     * If returns null, no ping is sent.
     */
    protected getPingMessage(): unknown | null {
        return null;
    }
}
