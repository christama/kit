/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type {
    ToncenterTransaction,
    EmulationTransactionDescription,
    EmulationAccountState,
} from '../../../types/toncenter/emulation';
import type { StreamingV2TransactionRaw } from '../types/transaction';
import type { StreamingV2AccountState } from '../types/account';

/** Default compute_ph for skipped transactions */
const DEFAULT_COMPUTE_PH_SKIPPED: EmulationTransactionDescription['compute_ph'] = {
    skipped: true,
    success: false,
    msg_state_used: false,
    account_activated: false,
    gas_fees: '0',
    gas_used: '0',
    gas_limit: '0',
    mode: 0,
    exit_code: 0,
    vm_steps: 0,
    vm_init_state_hash: '',
    vm_final_state_hash: '',
};

/** Default action for failed/skipped transactions */
const DEFAULT_ACTION: EmulationTransactionDescription['action'] = {
    success: false,
    valid: false,
    no_funds: false,
    status_change: 'unchanged',
    result_code: 0,
    tot_actions: 0,
    spec_actions: 0,
    skipped_actions: 0,
    msgs_created: 0,
    action_list_hash: '',
    tot_msg_size: { cells: '0', bits: '0' },
};

/**
 * Maps a v2 streaming transaction to ToncenterTransaction.
 * Handles simplified compute_ph when skipped and injects trace_external_hash from event.
 */
export function toToncenterTransaction(
    raw: StreamingV2TransactionRaw,
    traceExternalHashNorm: string,
): ToncenterTransaction {
    const computePh = raw.description.compute_ph;
    const isSkipped = 'skipped' in computePh && computePh.skipped;

    const fullComputePh: EmulationTransactionDescription['compute_ph'] = isSkipped
        ? DEFAULT_COMPUTE_PH_SKIPPED
        : {
              skipped: computePh.skipped,
              success: computePh.success,
              msg_state_used: computePh.msg_state_used ?? false,
              account_activated: computePh.account_activated ?? false,
              gas_fees: computePh.gas_fees ?? '0',
              gas_used: computePh.gas_used ?? '0',
              gas_limit: computePh.gas_limit ?? '0',
              gas_credit: computePh.gas_credit,
              mode: computePh.mode ?? 0,
              exit_code: computePh.exit_code ?? 0,
              vm_steps: computePh.vm_steps ?? 0,
              vm_init_state_hash: computePh.vm_init_state_hash ?? '',
              vm_final_state_hash: computePh.vm_final_state_hash ?? '',
          };

    const action = raw.description.action ?? DEFAULT_ACTION;

    const fullDescription: EmulationTransactionDescription = {
        type: raw.description.type,
        aborted: raw.description.aborted,
        destroyed: raw.description.destroyed,
        credit_first: raw.description.credit_first,
        is_tock: raw.description.is_tock,
        installed: raw.description.installed,
        storage_ph: raw.description.storage_ph,
        credit_ph: raw.description.credit_ph,
        compute_ph: fullComputePh,
        action: {
            success: action.success,
            valid: action.valid ?? false,
            no_funds: action.no_funds ?? false,
            status_change: action.status_change ?? 'unchanged',
            total_fwd_fees: action.total_fwd_fees,
            total_action_fees: action.total_action_fees,
            result_code: action.result_code ?? 0,
            tot_actions: action.tot_actions ?? 0,
            spec_actions: action.spec_actions ?? 0,
            skipped_actions: action.skipped_actions ?? 0,
            msgs_created: action.msgs_created ?? 0,
            action_list_hash: action.action_list_hash ?? '',
            tot_msg_size: action.tot_msg_size ?? { cells: '0', bits: '0' },
        },
    };

    const normalizeAccountState = (s: StreamingV2AccountState): EmulationAccountState => ({
        hash: s.hash ?? '',
        balance: s.balance ?? '0',
        extra_currencies: s.extra_currencies ?? null,
        account_status: s.account_status ?? 'active',
        frozen_hash: s.frozen_hash ?? null,
        data_hash: s.data_hash ?? null,
        code_hash: s.code_hash ?? null,
    });

    return {
        account: raw.account,
        hash: raw.hash,
        lt: raw.lt,
        now: raw.now,
        mc_block_seqno: raw.mc_block_seqno,
        trace_external_hash: traceExternalHashNorm,
        prev_trans_hash: raw.prev_trans_hash,
        prev_trans_lt: raw.prev_trans_lt,
        orig_status: raw.orig_status,
        end_status: raw.end_status,
        total_fees: raw.total_fees,
        total_fees_extra_currencies: raw.total_fees_extra_currencies ?? {},
        description: fullDescription,
        block_ref: raw.block_ref,
        in_msg: raw.in_msg,
        out_msgs: raw.out_msgs ?? [],
        account_state_before: normalizeAccountState(raw.account_state_before),
        account_state_after: normalizeAccountState(raw.account_state_after),
        emulated: raw.emulated ?? false,
        trace_id: raw.trace_id,
    };
}
