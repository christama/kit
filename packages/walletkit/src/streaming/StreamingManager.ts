/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { Network } from '../api/models';
import type { StreamingProvider, StreamingProviderFactory, StreamingAPI } from '../api/interfaces';
import type {
    JettonUpdate,
    BalanceUpdate,
    TransactionsUpdate,
    StreamingUpdate,
    StreamingWatchType,
    StreamingEvents,
} from '../api/models';
import { globalLogger } from '../core/Logger';
import { asAddressFriendly, compareAddress } from '../utils';
import type { EventEmitter } from '../core/EventEmitter';

const log = globalLogger.createChild('StreamingManager');

/**
 * Orchestrates streaming providers and synchronizes them with the global EventEmitter.
 */
export class StreamingManager<E extends StreamingEvents = StreamingEvents> implements StreamingAPI {
    private providers: Map<string, StreamingProvider> = new Map();
    private providerFactories: Map<string, StreamingProviderFactory> = new Map();

    constructor(private eventEmitter: EventEmitter<E>) {}

    /**
     * Register a provider factory for a specific network.
     */
    registerProvider(network: Network, factory: StreamingProviderFactory): void {
        const networkId = String(network.chainId);

        if (this.providerFactories.has(networkId)) {
            log.warn(`Provider factory for network ${networkId} is already registered. Overriding with new factory.`);
        }

        this.providerFactories.set(networkId, factory);
    }

    /**
     * Check if a provider factory is registered for a specific network.
     */
    hasProvider(network: Network): boolean {
        return this.providerFactories.has(String(network.chainId));
    }

    /**
     * Watch account balance changes.
     */
    watchBalance(network: Network, address: string, onChange: (update: BalanceUpdate) => void): () => void {
        const unwatchProvider = this.getProvider(network).watchBalance(asAddressFriendly(address));
        const off = this.eventEmitter.on('streaming:balance-update', ({ payload: update }) => {
            if (compareAddress(address, update.address)) onChange(update);
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
        const unwatchProvider = this.getProvider(network).watchTransactions(asAddressFriendly(address));
        const off = this.eventEmitter.on('streaming:transactions', ({ payload: update }) => {
            if (compareAddress(address, update.address)) onChange(update);
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
        const unwatchProvider = this.getProvider(network).watchJettons(asAddressFriendly(address));
        const off = this.eventEmitter.on('streaming:jettons-update', ({ payload: jetton }) => {
            if (compareAddress(address, jetton.ownerAddress)) onChange(jetton);
        });

        return () => {
            unwatchProvider();
            off();
        };
    }

    /**
     * Bulk watch multiple types for an address.
     */
    watch(
        network: Network,
        address: string,
        types: Exclude<StreamingWatchType, 'trace'>[],
        onUpdate: (type: StreamingWatchType, update: StreamingUpdate) => void,
    ): () => void {
        const unwatchers = types.map((type) => {
            switch (type) {
                case 'balance':
                    return this.watchBalance(network, address, (u) => onUpdate('balance', u));
                case 'transactions':
                    return this.watchTransactions(network, address, (u) => onUpdate('transactions', u));
                case 'jettons':
                    return this.watchJettons(network, address, (u) => onUpdate('jettons', u));
                default:
                    return () => {};
            }
        });

        return () => unwatchers.forEach((unwatch) => unwatch());
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
                onBalanceUpdate: (update) =>
                    this.eventEmitter.emit(
                        'streaming:balance-update',
                        update as E['streaming:balance-update'],
                        'streaming-manager',
                    ),
                onTransactions: (update) =>
                    this.eventEmitter.emit(
                        'streaming:transactions',
                        update as E['streaming:transactions'],
                        'streaming-manager',
                    ),
                onJettonsUpdate: (update) =>
                    this.eventEmitter.emit(
                        'streaming:jettons-update',
                        update as E['streaming:jettons-update'],
                        'streaming-manager',
                    ),
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
    }
}
