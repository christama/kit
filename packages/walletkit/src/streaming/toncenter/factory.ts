/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { StreamingProviderFactory } from '../StreamingManager';
import { TonCenterStreamingProvider } from './TonCenterStreamingProvider';
import type { TonCenterStreamingProviderConfig } from './TonCenterStreamingProvider';

export type TonCenterStreamingFactoryConfig = Omit<TonCenterStreamingProviderConfig, 'network' | 'listener'>;

export const createTonCenterStreamingProviderFactory =
    (config?: TonCenterStreamingFactoryConfig): StreamingProviderFactory =>
    ({ network, listener }) => {
        return new TonCenterStreamingProvider({ network, listener, ...config });
    };
