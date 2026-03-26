/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { Preview } from '@storybook/react';
import type { Decorator } from '@storybook/react';
import React from 'react';

import { I18nProvider } from '../src/providers/i18n-provider';
import '../src/styles/index.css';
import theme from './theme';

const withI18n: Decorator = (Story) => (
    <I18nProvider>
        <Story />
    </I18nProvider>
);

const withTheme: Decorator = (Story, context) => {
    const theme = context.globals.theme;

    React.useEffect(() => {
        document.documentElement.setAttribute('data-ta-theme', theme);
    }, [theme]);

    return <Story />;
};

const preview: Preview = {
    tags: ['autodocs'],
    globalTypes: {
        theme: {
            name: 'Theme',
            description: 'Global theme for components',
            defaultValue: 'dark',
            toolbar: {
                icon: 'circlehollow',
                items: [
                    { value: 'light', icon: 'sun', title: 'Light' },
                    { value: 'dark', icon: 'moon', title: 'Dark' },
                ],
            },
        },
    },
    parameters: {
        docs: {
            theme,
        },
        actions: { argTypesRegex: '^on[A-Z].*' },
        controls: {
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/,
            },
        },
        backgrounds: {
            default: 'dark',
            values: [
                { name: 'dark', value: '#141416' },
                { name: 'light', value: '#ffffff' },
            ],
        },
    },
    decorators: [withTheme, withI18n],
};

export default preview;
