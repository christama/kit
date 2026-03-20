/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { asAddressFriendly } from '../../../utils';
import type { TransactionsUpdate } from '../../types';
import type { StreamingV2TransactionsNotification } from '../types/transaction';

export function mapTransactions(
    account: string,
    notification: StreamingV2TransactionsNotification,
): TransactionsUpdate {
    return {
        address: asAddressFriendly(account),
        transactions: notification.transactions,
        finality: notification.finality,
    };
}
