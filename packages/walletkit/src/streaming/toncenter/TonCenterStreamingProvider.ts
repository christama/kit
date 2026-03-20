/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { Network } from '../../api/models';
import { globalLogger } from '../../core/Logger';
import type { StreamingProviderListener } from '../StreamingProvider';
import type { StreamingV2SubscriptionRequest, StreamingV2EventType } from './types/core';
import { isAccountStateNotification } from './guards/account';
import { isJettonsNotification } from './guards/jetton';
import { isTransactionsNotification, isTraceNotification, isTraceInvalidatedNotification } from './guards/transaction';
import { asAddressFriendly } from '../../utils';
import { mapBalance } from './mappers/map-balance';
import { mapTransactions } from './mappers/map-transactions';
import { mapJettons } from './mappers/map-jettons';
import { mapTrace } from './mappers/map-trace';
import { WebsocketStreamingProvider } from '../WebsocketStreamingProvider';

const log = globalLogger.createChild('TonCenterStreamingProvider');

const WS_PATH = '/api/streaming/v2/ws';

export interface TonCenterStreamingProviderConfig {
    endpoint?: string;
    apiKey?: string;
    network?: Network;
    listener: StreamingProviderListener;
}

/**
 * Toncenter-specific implementation of StreamingProvider.
 * Manages a single WebSocket connection and reports account updates.
 */
export class TonCenterStreamingProvider extends WebsocketStreamingProvider {
    private baseUrl: string;
    private apiKey?: string;
    private network?: Network;

    constructor(config: TonCenterStreamingProviderConfig) {
        super(config.listener);

        this.network = config.network;
        this.apiKey = config.apiKey;

        const base =
            config.endpoint ??
            (this.network?.chainId === Network.mainnet().chainId
                ? 'wss://toncenter.com'
                : 'wss://testnet.toncenter.com');

        this.baseUrl = base.replace(/\/$/, '').replace(/^https?/, 'wss') + WS_PATH;
    }

    protected getUrl(): string {
        let url = this.baseUrl;
        if (this.apiKey) {
            const separator = url.includes('?') ? '&' : '?';
            url += `${separator}api_key=${encodeURIComponent(this.apiKey)}`;
        }
        return url;
    }

    protected getPingMessage(): unknown | null {
        return { operation: 'ping', id: `ping-${Date.now()}` };
    }

    protected unsubscribe(addresses: string[], traceHashes: string[]): void {
        if (!this.isConnected || this.ws?.readyState !== WebSocket.OPEN) {
            return;
        }

        if (addresses.length === 0 && traceHashes.length === 0) return;

        this.send({
            operation: 'unsubscribe',
            id: `unsub-${Date.now()}`,
            addresses: addresses.length > 0 ? addresses : undefined,
            trace_external_hash_norms: traceHashes.length > 0 ? traceHashes : undefined,
        });

        log.info('Unsubscribed', { addresses, traceHashes });
    }

    protected updateSubscription(): void {
        if (!this.isConnected || this.ws?.readyState !== WebSocket.OPEN) {
            return;
        }

        const addresses = new Set<string>();
        [this.watchedBalance, this.watchedTransactions, this.watchedJettons, this.watchedTracesAddresses].forEach(
            (s) => {
                s.forEach((addr) => addresses.add(addr));
            },
        );

        const traceHashes = Array.from(this.watchedTraceHashes);

        if (addresses.size === 0 && traceHashes.length === 0) return;

        const types: StreamingV2EventType[] = [];
        if (this.watchedBalance.size > 0) types.push('account_state_change');
        if (this.watchedTransactions.size > 0) types.push('transactions');
        if (this.watchedJettons.size > 0) types.push('jettons_change');
        if (this.watchedTraceHashes.size > 0 || this.watchedTracesAddresses.size > 0) types.push('trace');

        const request: StreamingV2SubscriptionRequest = {
            addresses: addresses.size > 0 ? Array.from(addresses) : undefined,
            trace_external_hash_norms: traceHashes.length > 0 ? traceHashes : undefined,
            types,
            min_finality: 'pending',
            include_metadata: true,
        };

        this.send({
            operation: 'subscribe',
            id: `sub-${Date.now()}`,
            ...request,
        });

        log.info('Subscription updated', {
            addresses: Array.from(addresses),
            traceHashes,
            types,
        });
    }

    protected onMessage(event: MessageEvent): void {
        try {
            const msg = JSON.parse(event.data as string) as unknown;
            const m = msg as Record<string, unknown>;
            log.info('Toncenter WS received message:', m);
            if (m.status === 'subscribed' || m.status === 'pong') {
                return;
            }

            if (isAccountStateNotification(msg)) {
                const update = mapBalance(msg);
                this.listener.onBalanceUpdate(update);
            }

            if (isTransactionsNotification(msg)) {
                const accounts = new Set<string>();
                msg.transactions.forEach((tx: { account: string }) => accounts.add(tx.account));

                accounts.forEach((account) => {
                    const friendly = asAddressFriendly(account);
                    if (this.watchedTransactions.has(friendly)) {
                        const update = mapTransactions(account, msg);
                        this.listener.onTransactions(update);
                    }
                });
            }

            if (isJettonsNotification(msg)) {
                const update = mapJettons(msg);
                log.info('Jetton update', { update });
                if (this.watchedJettons.has(update.ownerAddress)) {
                    this.listener.onJettonsUpdate(update);
                }
            }

            if (isTraceNotification(msg) || isTraceInvalidatedNotification(msg)) {
                if (isTraceInvalidatedNotification(msg)) {
                    log.info('Trace invalidated', { hash: msg.trace_external_hash_norm });
                }
                const update = mapTrace(msg);
                this.listener.onTraceUpdate(update);
            }
        } catch (err) {
            log.warn('Failed to parse WebSocket message', { error: err });
        }
    }
}
