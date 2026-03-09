/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import React, { memo } from 'react';
import type { Action } from '@ton/walletkit';

import { TransactionCard } from './TransactionCard';

interface ActionCardProps {
    action: Action;
    myAddress: string;
    timestamp: number;
    traceLink: string;
    /** When true, renders as pending (spinner icon, "Pending" status) */
    isPending?: boolean;
}

/**
 * Wrapper that extracts Action data and renders TransactionCard
 */
export const ActionCard: React.FC<ActionCardProps> = memo(
    ({ action, myAddress, timestamp, traceLink, isPending = false }) => {
        const { simplePreview, status } = action;
        const { description, value, accounts, valueImage } = simplePreview;

        const isOutgoing = accounts.length > 0 && accounts[0]?.address === myAddress;
        const txStatus = isPending ? 'pending' : status === 'failure' ? 'failure' : 'success';

        return (
            <TransactionCard
                description={description}
                value={value}
                valueImage={valueImage}
                timestamp={timestamp}
                traceLink={traceLink}
                status={txStatus}
                isOutgoing={isOutgoing}
            />
        );
    },
);
