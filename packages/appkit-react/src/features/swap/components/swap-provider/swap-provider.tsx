/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { FC, PropsWithChildren, ReactNode } from 'react';

export interface SwapToken {
    /** Token symbol, e.g. "TON" */
    symbol: string;
    /** Full token name, e.g. "Toncoin" */
    name: string;
    /** Number of decimals for the token */
    decimals: number;
    /** Jetton contract address (use "native" for TON) */
    address: string;
    /** Optional token logo — can be a ReactNode (SVG, img) */
    logo?: ReactNode;
    /** Optional exchange rate: 1 token = rate fiat units */
    rate?: number;
    /** Optional user balance */
    balance?: string;
}

export interface SwapContextType {
    /** Full list of available tokens */
    tokens: SwapToken[];
    /** Currently selected "from" token */
    fromToken: SwapToken | null;
    /** Currently selected "to" token */
    toToken: SwapToken | null;
    /** Amount the user wants to swap (string to preserve input UX) */
    fromAmount: string;
    /** Calculated receive amount */
    toAmount: string;
    /** Fiat currency symbol, e.g. "$" */
    fiatSymbol: string;
    /** Fiat value of fromAmount, null when rate is unavailable */
    fromFiatValue: string | null;
    /** Fiat value of toAmount, null when rate is unavailable */
    toFiatValue: string | null;
    /** True while the flip animation should be active */
    isFlipped: boolean;
    /** Whether the user can proceed with the swap */
    canSubmit: boolean;
    setFromToken: (token: SwapToken) => void;
    setToToken: (token: SwapToken) => void;
    setFromAmount: (amount: string) => void;
    onFlip: () => void;
    onMaxClick: () => void;
}

export const SwapContext = createContext<SwapContextType>({
    tokens: [],
    fromToken: null,
    toToken: null,
    fromAmount: '',
    toAmount: '',
    fiatSymbol: '$',
    fromFiatValue: null,
    toFiatValue: null,
    isFlipped: false,
    canSubmit: false,
    setFromToken: () => {},
    setToToken: () => {},
    setFromAmount: () => {},
    onFlip: () => {},
    onMaxClick: () => {},
});

export function useSwapContext() {
    return useContext(SwapContext);
}

export interface SwapProviderProps extends PropsWithChildren {
    /** Full list of tokens available for swapping */
    tokens: SwapToken[];
    /** Fiat currency symbol shown next to amounts, defaults to "$" */
    fiatSymbol?: string;
    /** Symbol of the token pre-selected in the "from" field */
    defaultFromSymbol?: string;
    /** Symbol of the token pre-selected in the "to" field */
    defaultToSymbol?: string;
}

export const SwapProvider: FC<SwapProviderProps> = ({
    children,
    tokens,
    fiatSymbol = '$',
    defaultFromSymbol,
    defaultToSymbol,
}) => {
    const [fromToken, setFromToken] = useState<SwapToken | null>(
        tokens.find((t) => t.symbol === defaultFromSymbol) ?? tokens[0] ?? null,
    );
    const [toToken, setToToken] = useState<SwapToken | null>(
        tokens.find((t) => t.symbol === defaultToSymbol) ?? tokens[1] ?? null,
    );
    const [fromAmount, setFromAmount] = useState('');
    const [isFlipped, setIsFlipped] = useState(false);

    const toAmount = useMemo(() => {
        const fromNum = parseFloat(fromAmount) || 0;

        if (!fromToken?.rate || !toToken?.rate || fromNum <= 0) return '';

        const result = (fromNum * fromToken.rate) / toToken.rate;

        return result >= 1 ? result.toFixed(2) : result.toFixed(6);
    }, [fromAmount, fromToken, toToken]);

    const fromFiatValue = useMemo(() => {
        const fromNum = parseFloat(fromAmount) || 0;

        if (!fromToken?.rate || fromNum <= 0) return null;

        return (fromNum * fromToken.rate).toFixed(2);
    }, [fromAmount, fromToken]);

    const toFiatValue = useMemo(() => {
        const toNum = parseFloat(toAmount) || 0;

        if (!toToken?.rate || toNum <= 0) return null;

        return (toNum * toToken.rate).toFixed(2);
    }, [toAmount, toToken]);

    const handleFlip = useCallback(() => {
        setIsFlipped((prev) => !prev);
        setFromToken(toToken);
        setToToken(fromToken);
        setFromAmount(toAmount);
    }, [fromToken, toToken, toAmount]);

    const handleMaxClick = useCallback(() => {
        if (fromToken?.balance) {
            setFromAmount(fromToken.balance.replace(/\s/g, ''));
        }
    }, [fromToken]);

    const canSubmit = (parseFloat(fromAmount) || 0) > 0 && fromToken !== null && toToken !== null;

    const value = useMemo(
        () => ({
            tokens,
            fromToken,
            toToken,
            fromAmount,
            toAmount,
            fiatSymbol,
            fromFiatValue,
            toFiatValue,
            isFlipped,
            canSubmit,
            setFromToken,
            setToToken,
            setFromAmount,
            onFlip: handleFlip,
            onMaxClick: handleMaxClick,
        }),
        [
            tokens,
            fromToken,
            toToken,
            fromAmount,
            toAmount,
            fiatSymbol,
            fromFiatValue,
            toFiatValue,
            isFlipped,
            canSubmit,
            handleFlip,
            handleMaxClick,
        ],
    );

    return <SwapContext.Provider value={value}>{children}</SwapContext.Provider>;
};
