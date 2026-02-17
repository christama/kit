/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { useMemo } from 'react';
import type { FC } from 'react';
import { formatUnits, parseUnits } from '@ton/appkit';
import { Transaction, useSwapQuote, useNetwork, useAddress, useBuildSwapTransaction } from '@ton/appkit-react';

export const USDT_ADDRESS = 'EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs';

interface SwapButtonProps {
    amount: string;
    direction: 'from' | 'to';
    providerId?: string;
}

export const SwapButton: FC<SwapButtonProps> = ({ amount, direction, providerId }) => {
    const network = useNetwork();
    const address = useAddress();
    const decimals = direction === 'from' ? 9 : 6;
    const reverseDecimals = direction === 'from' ? 6 : 9;
    const {
        data: quote,
        isError,
        isLoading,
    } = useSwapQuote({
        amount: parseUnits(amount, decimals).toString(),
        fromToken: direction === 'from' ? { type: 'ton' } : { type: 'jetton', value: USDT_ADDRESS },
        toToken: direction === 'to' ? { type: 'ton' } : { type: 'jetton', value: USDT_ADDRESS },
        network,
        slippageBps: 100,
        providerId,
    });

    const { mutateAsync: buildSwapTransaction } = useBuildSwapTransaction();

    const handleBuildSwapTransaction = () => {
        if (!quote || !address) {
            return Promise.reject(new Error('Missing quote or address'));
        }

        return buildSwapTransaction({
            quote,
            userAddress: address,
        });
    };

    const buttonText = useMemo(() => {
        if (isLoading) {
            return 'Fetching quote...';
        }

        if (isError || !quote) {
            return 'Swap Unavailable';
        }

        return `Swap ${formatUnits(quote.fromAmount, decimals)} ${direction === 'from' ? 'TON' : 'USDT'} -> ${formatUnits(quote.toAmount, reverseDecimals)} ${direction === 'to' ? 'TON' : 'USDT'}`;
    }, [isLoading, isError, quote]);

    return (
        <Transaction request={handleBuildSwapTransaction} disabled={!quote || isLoading || isError} text={buttonText} />
    );
};
