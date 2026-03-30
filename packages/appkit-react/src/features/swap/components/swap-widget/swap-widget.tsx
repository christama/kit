/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { FC, ReactNode } from 'react';

import { Button } from '../../../../components/button';
import { SwapField } from '../swap-field';
import { SwapFlipButton } from '../swap-flip-button';
import { SwapInfo } from '../swap-info';
import { SwapSettingsButton } from '../swap-settings-button';
import { SwapProvider, useSwapContext } from '../swap-provider';
import type { SwapContextType, SwapProviderProps } from '../swap-provider';
import styles from './swap-widget.module.css';

export type SwapWidgetRenderProps = SwapContextType;

export interface SwapWidgetProps extends Omit<SwapProviderProps, 'children'> {
    /** Custom render function — when provided, replaces the default widget UI */
    children?: (props: SwapWidgetRenderProps) => ReactNode;
}

const SwapWidgetContent: FC<{ children?: (props: SwapWidgetRenderProps) => ReactNode }> = ({ children }) => {
    const ctx = useSwapContext();
    const {
        fromToken,
        toToken,
        fromAmount,
        toAmount,
        fromFiatValue,
        toFiatValue,
        fiatSymbol,
        isFlipped,
        canSubmit,
        onFlip,
        onMaxClick,
        setFromAmount,
    } = ctx;

    if (children) {
        return <>{children(ctx)}</>;
    }

    return (
        <div className={styles.widget}>
            <div className={styles.header}>
                <h2 className={styles.headerTitle}>Swap</h2>
                <SwapSettingsButton />
            </div>

            <div className={styles.fieldsContainer}>
                <SwapField
                    type="pay"
                    tokenSymbol={fromToken?.symbol ?? ''}
                    tokenIcon={fromToken?.logo}
                    amount={fromAmount}
                    onAmountChange={setFromAmount}
                    usdValue={fromFiatValue ?? undefined}
                    balance={fromToken?.balance}
                    onMaxClick={onMaxClick}
                />

                <div className={styles.flipButtonWrapper}>
                    <SwapFlipButton onClick={onFlip} rotated={isFlipped} />
                </div>

                <SwapField
                    type="receive"
                    tokenSymbol={toToken?.symbol ?? ''}
                    tokenIcon={toToken?.logo}
                    amount={toAmount}
                    onAmountChange={() => {}}
                    usdValue={toFiatValue ?? undefined}
                    balance={toToken?.balance}
                />
            </div>

            {canSubmit && fromToken && toToken && (
                <SwapInfo
                    rows={[
                        {
                            label: 'Price',
                            value: fromToken.rate
                                ? `1 ${fromToken.symbol} ≈ ${fiatSymbol}${fromToken.rate.toFixed(4)}`
                                : '—',
                        },
                    ]}
                />
            )}

            <Button variant="fill" size="l" fullWidth style={{ marginTop: '8px' }} disabled={!canSubmit}>
                {canSubmit ? 'Continue' : 'Enter an amount'}
            </Button>
        </div>
    );
};

export const SwapWidget: FC<SwapWidgetProps> = ({
    children,
    tokens,
    fiatSymbol,
    defaultFromSymbol,
    defaultToSymbol,
}) => {
    return (
        <SwapProvider
            tokens={tokens}
            fiatSymbol={fiatSymbol}
            defaultFromSymbol={defaultFromSymbol}
            defaultToSymbol={defaultToSymbol}
        >
            <SwapWidgetContent>{children}</SwapWidgetContent>
        </SwapProvider>
    );
};
