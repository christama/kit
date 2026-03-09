/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import React, { memo } from 'react';
import { Link } from 'react-router-dom';

import { formatTimestamp } from '../../utils';

export interface TransactionCardProps {
    description: string;
    value: string;
    valueImage?: string;
    timestamp: number;
    traceLink: string;
    status: 'pending' | 'success' | 'failure';
    isOutgoing?: boolean;
}

/**
 * Unified card for pending and confirmed transactions.
 * Same layout: description, value, timestamp. Only status icon differs.
 */
export const TransactionCard: React.FC<TransactionCardProps> = memo(
    ({ description, value, valueImage, timestamp, traceLink, status, isOutgoing = false }) => {
        const isFailed = status === 'failure';
        const isPending = status === 'pending';

        const { bgColor, icon } = (() => {
            if (isPending) {
                return {
                    bgColor: 'bg-yellow-100',
                    icon: (
                        <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
                    ),
                };
            }
            if (isFailed) {
                return {
                    bgColor: 'bg-red-100',
                    icon: (
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    ),
                };
            }
            if (isOutgoing) {
                return {
                    bgColor: 'bg-red-100',
                    icon: (
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 11l5-5m0 0l5 5m-5-5v12"
                            />
                        </svg>
                    ),
                };
            }
            return {
                bgColor: 'bg-green-100',
                icon: (
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 13l-5 5m0 0l-5-5m5 5V6"
                        />
                    </svg>
                ),
            };
        })();

        const valueColor = isFailed ? 'text-red-600' : isOutgoing ? 'text-red-600' : 'text-green-600';
        const valueWithSign = isFailed ? value : isOutgoing ? `-${value}` : `+${value}`;
        const statusText = isPending ? 'Pending' : isFailed ? 'Failed' : formatTimestamp(timestamp);

        const content = (
            <>
                <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bgColor}`}>{icon}</div>
                    <div>
                        <p className="text-sm font-medium text-gray-900">{description}</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                        {valueImage && (
                            <img
                                src={valueImage}
                                alt=""
                                className="w-4 h-4 rounded-full"
                                onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                }}
                            />
                        )}
                        <p className={`text-sm font-medium ${valueColor}`}>{valueWithSign}</p>
                    </div>
                    <p
                        className={`text-xs ${isPending ? 'text-yellow-600' : isFailed ? 'text-red-500' : 'text-gray-400'}`}
                    >
                        {statusText}
                    </p>
                </div>
            </>
        );

        return (
            <Link
                to={traceLink}
                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg border border-gray-100"
            >
                {content}
            </Link>
        );
    },
);

TransactionCard.displayName = 'TransactionCard';
