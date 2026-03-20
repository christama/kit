/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { TransactionEmulatedTrace } from '../api/models';
import type { RawBridgeEventRestoreConnection, RawBridgeEventTransaction } from './internal';
import type { EventEmitter } from '../core/EventEmitter';
import type { BalanceUpdate, TransactionsUpdate, JettonUpdate, TraceUpdate } from '../streaming';

/**
 * Definition of all events emitted by the TonWalletKit.
 */
export interface KitEvents {
    restoreConnection: RawBridgeEventRestoreConnection;
    eventError: RawBridgeEventTransaction;
    emulationResult: TransactionEmulatedTrace;
    bridgeStorageUpdated: object;

    // Streaming events
    balanceUpdate: BalanceUpdate;
    transactions: TransactionsUpdate;
    jettonsUpdate: JettonUpdate;
    trace: TraceUpdate;
}

export type WalletKitEventEmitter = EventEmitter<KitEvents>;
