/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { Network } from '../api/models';
import type { WalletKitEventEmitter } from '../types/emitter';
import type { StreamingProvider, StreamingProviderListener } from './StreamingProvider';
import type { JettonUpdate, BalanceUpdate, TransactionsUpdate, TraceUpdate } from './types';
import { globalLogger } from '../core/Logger';
import { asAddressFriendly, compareAddress } from '../utils';

const log = globalLogger.createChild('StreamingManager');

export type StreamingProviderFactory = (options: {
    network: Network;
    listener: StreamingProviderListener;
}) => StreamingProvider;

/**
 * Orchestrates streaming providers and synchronizes them with the global EventEmitter.
 */
export class StreamingManager {
    private providers: Map<string, StreamingProvider> = new Map();
    private watchCounts: Map<string, Map<string, number>> = new Map(); // network -> address -> count
    private providerFactories: Map<string, StreamingProviderFactory> = new Map();

    constructor(private eventEmitter: WalletKitEventEmitter) {}

    /**
     * Register a provider factory for a specific network.
     */
    registerProviderFactory(network: Network, factory: StreamingProviderFactory): void {
        const networkId = String(network.chainId);

        if (this.providerFactories.has(networkId)) {
            log.warn(`Provider factory for network ${networkId} is already registered. Overriding with new factory.`);
        }

        this.providerFactories.set(networkId, factory);
    }

    /**
     * Watch account balance changes.
     */
    watchBalance(network: Network, address: string, onChange: (update: BalanceUpdate) => void): () => void {
        const id = asAddressFriendly(address);
        const unwatchProvider = this.incrementWatch(network, 'balance', id);
        const off = this.eventEmitter.on('balanceUpdate', ({ payload: update }) => {
            if (compareAddress(address, update.address)) {
                onChange(update);
            }
        });

        return () => {
            unwatchProvider();
            off();
        };
    }

    /**
     * Watch transactions for an address.
     */
    watchTransactions(network: Network, address: string, onChange: (update: TransactionsUpdate) => void): () => void {
        const id = asAddressFriendly(address);
        const unwatchProvider = this.incrementWatch(network, 'transactions', id);
        const off = this.eventEmitter.on('transactions', ({ payload: update }) => {
            if (compareAddress(address, update.address)) {
                onChange(update);
            }
        });

        return () => {
            unwatchProvider();
            off();
        };
    }

    /**
     * Watch jetton changes for an address.
     */
    watchJettons(network: Network, address: string, onChange: (jetton: JettonUpdate) => void): () => void {
        const id = asAddressFriendly(address);
        const unwatchProvider = this.incrementWatch(network, 'jettons', id);
        const off = this.eventEmitter.on('jettonsUpdate', ({ payload: jetton }) => {
            if (compareAddress(address, jetton.ownerAddress)) {
                onChange(jetton);
            }
        });

        return () => {
            unwatchProvider();
            off();
        };
    }

    /**
     * Watch a specific trace by hash.
     */
    watchTrace(network: Network, hash: string, onChange: (update: TraceUpdate) => void): () => void {
        const unwatchProvider = this.incrementWatch(network, 'trace', hash);
        const off = this.eventEmitter.on('trace', ({ payload: update }) => {
            if (update.hash === hash) {
                onChange(update);
            }
        });

        return () => {
            unwatchProvider();
            off();
        };
    }

    /**
     * Watch all traces for an address.
     */
    watchTraces(network: Network, address: string, onChange: (update: TraceUpdate) => void): () => void {
        const id = asAddressFriendly(address);
        const unwatchProvider = this.incrementWatch(network, 'traces', id);
        const off = this.eventEmitter.on('trace', ({ payload: update }) => {
            // We don't have an easy way to verify if this trace belongs to the address here
            // without parsing the trace, but the provider only received it because we watched the address.
            // However, multiple addresses might be watched.
            // For now, we emit and let the listener decide or we could try to filter if possible.
            // Most often, it's just one address per connection in demo-wallet.
            onChange(update);
        });

        return () => {
            unwatchProvider();
            off();
        };
    }

    private incrementWatch(
        network: Network,
        type: 'balance' | 'transactions' | 'jettons' | 'trace' | 'traces',
        id: string,
    ): () => void {
        const networkId = String(network.chainId);
        const resourceKey = `${type}:${id}`;

        let networkWatch = this.watchCounts.get(networkId);
        if (!networkWatch) {
            networkWatch = new Map();
            this.watchCounts.set(networkId, networkWatch);
        }

        const currentCount = networkWatch.get(resourceKey) || 0;
        networkWatch.set(resourceKey, currentCount + 1);

        const provider = this.getProvider(network);
        if (currentCount === 0) {
            this.callProviderWatch(provider, type, id);
        }

        const networkWatchSnapshot = networkWatch;
        return () => {
            const count = networkWatchSnapshot.get(resourceKey) || 0;
            if (count <= 1) {
                networkWatchSnapshot.delete(resourceKey);
                this.callProviderUnwatch(provider, type, id);
            } else {
                networkWatchSnapshot.set(resourceKey, count - 1);
            }
        };
    }

    private callProviderWatch(
        provider: StreamingProvider,
        type: 'balance' | 'transactions' | 'jettons' | 'trace' | 'traces',
        id: string,
    ): void {
        switch (type) {
            case 'balance':
                provider.watchBalance(id);
                break;
            case 'transactions':
                provider.watchTransactions(id);
                break;
            case 'jettons':
                provider.watchJettons(id);
                break;
            case 'trace':
                provider.watchTrace(id);
                break;
            case 'traces':
                provider.watchTraces(id);
                break;
        }
    }

    private callProviderUnwatch(
        provider: StreamingProvider,
        type: 'balance' | 'transactions' | 'jettons' | 'trace' | 'traces',
        id: string,
    ): void {
        switch (type) {
            case 'balance':
                provider.unwatchBalance(id);
                break;
            case 'transactions':
                provider.unwatchTransactions(id);
                break;
            case 'jettons':
                provider.unwatchJettons(id);
                break;
            case 'trace':
                provider.unwatchTrace(id);
                break;
            case 'traces':
                provider.unwatchTraces(id);
                break;
        }
    }

    private getProvider(network: Network): StreamingProvider {
        const networkId = String(network.chainId);
        let provider = this.providers.get(networkId);
        if (provider) return provider;

        const factory = this.providerFactories.get(networkId);
        if (!factory) {
            throw new Error(`No streaming provider factory registered for network ${networkId}`);
        }

        log.info('Creating new streaming provider', { networkId });

        provider = factory({
            network,
            listener: {
                onBalanceUpdate: (update) => {
                    this.eventEmitter.emit('balanceUpdate', update, 'streaming-manager');
                },
                onTransactions: (update) => {
                    this.eventEmitter.emit('transactions', update, 'streaming-manager');
                },
                onJettonsUpdate: (update) => {
                    this.eventEmitter.emit('jettonsUpdate', update, 'streaming-manager');
                },
                onTraceUpdate: (update) => {
                    this.eventEmitter.emit('trace', update, 'streaming-manager');
                },
            },
        });

        this.providers.set(networkId, provider);
        return provider;
    }

    /**
     * Close all active streaming connections.
     */
    shutdown(): void {
        this.providers.forEach((provider) => provider.close());
        this.providers.clear();
        this.watchCounts.clear();
    }
}
