/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { TraceUpdate } from '../../types';
import type { StreamingV2TraceNotification, StreamingV2TraceInvalidatedNotification } from '../types/transaction';

export function mapTrace(
    notification: StreamingV2TraceNotification | StreamingV2TraceInvalidatedNotification,
): TraceUpdate {
    if (notification.type === 'trace_invalidated') {
        return {
            hash: notification.trace_external_hash_norm,
            trace: undefined,
        };
    }
    return {
        hash: notification.trace_external_hash_norm,
        trace: notification.trace,
    };
}
