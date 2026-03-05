/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { MasterchainInfo } from '../../../api/models';
import type { TonApiMasterchainHeadResponse } from '../types/masterchain';

export function mapMasterchainInfo(rawResponse: TonApiMasterchainHeadResponse): MasterchainInfo {
    return {
        seqno: rawResponse.seqno,
        shard: rawResponse.shard,
        workchain: rawResponse.workchain_id,
        fileHash: rawResponse.file_hash,
        rootHash: rawResponse.root_hash,
    };
}
