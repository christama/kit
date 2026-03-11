/**
 * Copyright (c) TonTech.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import type { TransactionRequest, UserFriendlyAddress, Network } from '../../api/models';
import type {
    StakingAPI,
    StakeParams,
    UnstakeParams,
    StakingBalance,
    StakingInfo,
    StakingProviderInterface,
    StakingQuoteParams,
    StakingQuote,
} from './types';
import { StakingError, StakingErrorCode } from './errors';
import { globalLogger } from '../../core/Logger';
import { DefiManager } from '../DefiManager';

const log = globalLogger.createChild('StakingManager');

/**
 * StakingManager - manages staking providers and delegates staking operations
 *
 * Allows registration of multiple staking providers and provides a unified API
 * for staking operations. Providers can be switched dynamically.
 */
export class StakingManager extends DefiManager<StakingProviderInterface> implements StakingAPI {
    /**
     * Get a quote for staking or unstaking
     * @param params - Quote parameters
     * @param providerId - Optional provider id to use
     */
    async getQuote(params: StakingQuoteParams, providerId?: string): Promise<StakingQuote> {
        log.debug('Getting staking quote', params);
        try {
            const quote = await this.getProvider(providerId).getQuote(params);
            log.debug('Received staking quote', quote);
            return quote;
        } catch (error) {
            throw this.createError('Failed to get staking quote', StakingErrorCode.InvalidParams, { error, params });
        }
    }

    /**
     * Stake TON using a provider
     * @param params - Staking parameters
     * @param providerId - Optional provider id to use
     */
    async stake(params: StakeParams, providerId?: string): Promise<TransactionRequest> {
        log.debug('Building staking transaction', params);
        try {
            return await this.getProvider(providerId).stake(params);
        } catch (error) {
            throw this.createError('Failed to build staking transaction', StakingErrorCode.InvalidParams, {
                error,
                params,
            });
        }
    }

    /**
     * Unstake TON using a provider
     * @param params - Unstaking parameters
     * @param providerId - Optional provider id to use
     */
    async unstake(params: UnstakeParams, providerId?: string): Promise<TransactionRequest> {
        log.debug('Building unstaking transaction', params);
        try {
            return await this.getProvider(providerId).unstake(params);
        } catch (error) {
            throw this.createError('Failed to build unstaking transaction', StakingErrorCode.InvalidParams, {
                error,
                params,
            });
        }
    }

    /**
     * Get staking balance for a user
     * @param userAddress - User address
     * @param network - Network to query
     * @param providerId - Optional provider id to use
     */
    async getBalance(
        userAddress: UserFriendlyAddress,
        network?: Network,
        providerId?: string,
    ): Promise<StakingBalance> {
        log.debug('Getting staking balance', {
            userAddress,
            network,
            provider: providerId || this.defaultProviderId,
        });

        try {
            return await this.getProvider(providerId).getBalance(userAddress, network);
        } catch (error) {
            throw this.createError('Failed to get staking balance', StakingErrorCode.InvalidParams, {
                error,
                userAddress,
                network,
            });
        }
    }

    /**
     * Get staking information for a network
     * @param network - Network to query
     * @param providerId - Optional provider id to use
     */
    async getStakingInfo(network?: Network, providerId?: string): Promise<StakingInfo> {
        log.debug('Getting staking info', {
            network,
            provider: providerId || this.defaultProviderId,
        });

        try {
            return await this.getProvider(providerId).getStakingInfo(network);
        } catch (error) {
            throw this.createError('Failed to get staking info', StakingErrorCode.InvalidParams, { error, network });
        }
    }

    protected createError(message: string, code: string, details?: unknown): StakingError {
        const errorCode = Object.values(StakingErrorCode).includes(code as StakingErrorCode)
            ? (code as StakingErrorCode)
            : StakingErrorCode.InvalidParams;
        log.error(message, { code, details });
        return new StakingError(message, errorCode, details);
    }
}
