/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { asAddressFriendly } from '../../../utils';
import type { BalanceUpdate } from '../../types';
import type { StreamingV2AccountStateNotification } from '../types/account';

/**
 * Maps Toncenter account state change notification to a BalanceUpdate.
 * @param notification - Raw notification from Toncenter WebSocket
 * @returns BalanceUpdate object
 */
export function mapBalance(notification: StreamingV2AccountStateNotification): BalanceUpdate {
    return {
        address: asAddressFriendly(notification.account),
        balance: notification.state.balance,
        finality: notification.finality,
    };
}
