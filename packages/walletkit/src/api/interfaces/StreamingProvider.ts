/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { Network } from '../models/core/Network';
import type { BalanceUpdate, TransactionsUpdate, JettonUpdate } from '../models';

export interface StreamingProviderListener {
    onBalanceUpdate: (update: BalanceUpdate) => void;
    onTransactions: (update: TransactionsUpdate) => void;
    onJettonsUpdate: (update: JettonUpdate) => void;
}

export interface StreamingProvider {
    /**
     * Watch account balance changes. Returns an unsubscribe function.
     */
    watchBalance(address: string): () => void;

    /**
     * Watch transactions for an address. Returns an unsubscribe function.
     */
    watchTransactions(address: string): () => void;

    /**
     * Watch jetton changes for an address. Returns an unsubscribe function.
     */
    watchJettons(address: string): () => void;

    /**
     * Close the connection.
     */
    close(): void;
}

export interface StreamingProviderContext {
    network: Network;
    listener: StreamingProviderListener;
}

export type StreamingProviderFactory = (context: StreamingProviderContext) => StreamingProvider;
