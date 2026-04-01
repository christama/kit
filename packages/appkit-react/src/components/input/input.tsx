/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { createContext, useContext, useMemo, useRef, useState, useLayoutEffect } from 'react';
import type { FC, ReactNode, ComponentProps, ChangeEvent } from 'react';
import clsx from 'clsx';

import { Skeleton } from '../skeleton';
import { SIZE_ORDER } from './input-resize';
import type { InputSize } from './input-resize';
import styles from './input.module.css';

type InputVariant = 'default' | 'unstyled';

interface InputContextProps {
    size: InputSize;
    variant: InputVariant;
    disabled?: boolean;
    error?: boolean;
    loading?: boolean;
    resizable?: boolean;
}

const InputContext = createContext<InputContextProps | undefined>(undefined);

const useInputContext = () => {
    const context = useContext(InputContext);
    if (!context) {
        throw new Error('Input components must be used within an Input.Container');
    }
    return context;
};

export interface InputContainerProps extends ComponentProps<'div'> {
    size?: InputSize;
    variant?: InputVariant;
    disabled?: boolean;
    error?: boolean;
    loading?: boolean;
    resizable?: boolean;
    children: ReactNode;
}

const Container: FC<InputContainerProps> = ({
    size = 'm',
    variant = 'default',
    disabled,
    error,
    loading,
    resizable,
    className,
    children,
    ...props
}) => {
    const contextValue = useMemo(
        () => ({ size, variant, disabled, error, loading, resizable }),
        [size, variant, disabled, error, loading, resizable],
    );

    return (
        <InputContext.Provider value={contextValue}>
            <div
                className={clsx(
                    styles.container,
                    styles[`variant-${variant}`],
                    disabled && styles.disabled,
                    error && styles.error,
                    loading && styles.loading,
                    className,
                )}
                {...props}
            >
                {children}
            </div>
        </InputContext.Provider>
    );
};

export interface InputHeaderProps extends ComponentProps<'div'> {
    children: ReactNode;
}

const Header: FC<InputHeaderProps> = ({ className, children, ...props }) => (
    <div className={clsx(styles.header, className)} {...props}>
        {children}
    </div>
);

const Title: FC<ComponentProps<'span'>> = ({ className, children, ...props }) => (
    <span className={clsx(styles.title, className)} {...props}>
        {children}
    </span>
);

export interface InputFieldProps extends ComponentProps<'div'> {
    children: ReactNode;
}

const Field: FC<InputFieldProps> = ({ className, children, ...props }) => (
    <div className={clsx(styles.field, className)} {...props}>
        {children}
    </div>
);

export interface InputSlotProps extends ComponentProps<'div'> {
    side?: 'left' | 'right';
}

const Slot: FC<InputSlotProps> = ({ side, className, children, ...props }) => (
    <div className={clsx(styles.slot, side === 'right' && styles.right, className)} {...props}>
        {children}
    </div>
);

export type InputControlProps = ComponentProps<'input'>;

const InputControl: FC<InputControlProps> = ({ className, disabled: propsDisabled, onChange, ...props }) => {
    const { size: contextSize, disabled: contextDisabled, loading, resizable } = useInputContext();
    const disabled = propsDisabled || contextDisabled;

    const inputRef = useRef<HTMLInputElement>(null);
    const measureRefs = {
        l: useRef<HTMLSpanElement>(null),
        m: useRef<HTMLSpanElement>(null),
        s: useRef<HTMLSpanElement>(null),
    };
    const [effectiveSize, setEffectiveSize] = useState<InputSize>(contextSize);

    const adjustSize = () => {
        if (!resizable || !inputRef.current) return;
        const availableWidth = inputRef.current.clientWidth;
        if (availableWidth === 0) return;

        const startIndex = SIZE_ORDER.indexOf(contextSize);
        for (let i = startIndex; i < SIZE_ORDER.length; i++) {
            const size = SIZE_ORDER[i] as InputSize;
            const textWidth = measureRefs[size].current?.offsetWidth ?? Infinity;
            if (textWidth <= availableWidth) {
                setEffectiveSize(size);
                return;
            }
        }
        setEffectiveSize(SIZE_ORDER[SIZE_ORDER.length - 1] as InputSize);
    };

    // Re-measure when controlled value or context size changes
    useLayoutEffect(adjustSize, [resizable, contextSize, props.value]);

    // Re-measure on container resize (observe parent, not the input itself,
    // to avoid feedback loop when font-size change triggers ResizeObserver)
    useLayoutEffect(() => {
        const parent = inputRef.current?.parentElement;
        if (!resizable || !parent) return;
        const observer = new ResizeObserver(adjustSize);
        observer.observe(parent);
        return () => observer.disconnect();
    }, [resizable, contextSize]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        onChange?.(e);
        if (!resizable || !inputRef.current) return;
        const availableWidth = inputRef.current.clientWidth;
        if (availableWidth === 0) return;

        const startIndex = SIZE_ORDER.indexOf(contextSize);
        for (let i = startIndex; i < SIZE_ORDER.length; i++) {
            const size = SIZE_ORDER[i] as InputSize;
            const textWidth = measureRefs[size].current?.offsetWidth ?? Infinity;
            if (textWidth <= availableWidth) {
                setEffectiveSize(size);
                return;
            }
        }
        setEffectiveSize(SIZE_ORDER[SIZE_ORDER.length - 1] as InputSize);
    };

    const activeSize = resizable ? effectiveSize : contextSize;
    const typographyClass = styles[`input_${activeSize}`];
    const text = String(props.value ?? props.defaultValue ?? '');

    if (loading) {
        const skeletonClass = styles[`inputSkeleton_${contextSize}`];

        return (
            <div className={clsx(styles.input, styles.inputSkeleton, skeletonClass, className)}>
                <Skeleton width={75} height="70%" />
            </div>
        );
    }

    return (
        <>
            {resizable && (
                <>
                    <span ref={measureRefs.l} className={clsx(styles.inputMeasure, styles.input_l)} aria-hidden>
                        {text}
                    </span>
                    <span ref={measureRefs.m} className={clsx(styles.inputMeasure, styles.input_m)} aria-hidden>
                        {text}
                    </span>
                    <span ref={measureRefs.s} className={clsx(styles.inputMeasure, styles.input_s)} aria-hidden>
                        {text}
                    </span>
                </>
            )}
            <input
                className={clsx(styles.input, typographyClass, className)}
                disabled={disabled}
                {...props}
                ref={inputRef}
                onChange={handleChange}
            />
        </>
    );
};

const Caption: FC<ComponentProps<'span'>> = ({ className, children, ...props }) => {
    const { error } = useInputContext();
    return (
        <span className={clsx(styles.caption, error && styles.errorText, className)} {...props}>
            {children}
        </span>
    );
};

export const Input = Object.assign(Container, {
    Container,
    Header,
    Title,
    Field,
    Slot,
    Input: InputControl,
    Caption,
});
