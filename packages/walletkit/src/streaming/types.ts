/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { UserFriendlyAddress } from '../api/models';
import type { ToncenterTransaction } from '../types/toncenter/emulation';
import type { MetadataV3 } from '../types/toncenter/v3/AddressBookRowV3';

export type StreamingFinality = 'pending' | 'confirmed' | 'finalized';

export interface BalanceUpdate {
    /** The account address */
    address: UserFriendlyAddress;
    /** The account balance in nano units */
    balance: string;
    /** The finality of the update */
    finality?: StreamingFinality;
}

export interface TransactionsUpdate {
    /** The account address */
    address: UserFriendlyAddress;
    /** The array of transactions */
    transactions: ToncenterTransaction[];
    /** The finality of the update */
    finality?: StreamingFinality;
    /** Address book metadata from streaming v2 notification */
    addressBook?: MetadataV3['address_book'];
    /** Metadata from streaming v2 notification */
    metadata?: MetadataV3['metadata'];
}

export interface JettonUpdate {
    /** The master jetton contract address */
    masterAddress: UserFriendlyAddress;
    /** The jetton wallet contract address */
    walletAddress: UserFriendlyAddress;
    /** The owner of the jetton wallet */
    ownerAddress: UserFriendlyAddress;
    /** Balance in raw smallest units (e.g. nano) */
    balance: string;
    /** Decimals mapped from metadata if available */
    decimals?: number;
    /** Human readable formatted balance if decimals are known */
    formattedBalance?: string;
    /** The finality of the update */
    finality?: StreamingFinality;
}

export interface TraceUpdate {
    /** The trace hash */
    hash: string;
    /** The trace object data */
    trace: unknown;
}
