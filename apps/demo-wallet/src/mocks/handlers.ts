/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { http, HttpResponse } from 'msw';

/**
 * Demo handler for action intent endpoint.
 * Intercepts any fetch to *\/intent-action-demo* (regardless of origin)
 * and returns a sample sendTransaction action payload.
 */
export const handlers = [
    http.get('*/intent-action-demo*', ({ request }) => {
        const url = new URL(request.url);
        const address = url.searchParams.get('address') ?? '';

        return HttpResponse.json({
            action_type: 'sendTransaction',
            action: {
                messages: [
                    {
                        address,
                        amount: '100000000', // 0.1 TON
                    },
                ],
                valid_until: Math.floor(Date.now() / 1000) + 600,
            },
        });
    }),
];
