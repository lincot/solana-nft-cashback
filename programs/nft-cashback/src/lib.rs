use crate::instructions::*;
use anchor_lang::prelude::*;

mod instructions;
pub mod state;
mod utils;

declare_id!("5CZ3DsaaByC6zST9pz6Dqzv6NpUvdCn3PE9reFa6iYpF");

#[program]
pub mod nft_cashback {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        instructions::initialize(ctx)
    }

    pub fn create_cashback(
        ctx: Context<CreateCashback>,
        nft_name: String,
        nft_collection: Pubkey,
        lamports: u64,
        expiration_date: u32,
    ) -> Result<()> {
        instructions::create_cashback(ctx, nft_name, nft_collection, lamports, expiration_date)
    }

    pub fn claim_cashback(ctx: Context<ClaimCashback>) -> Result<()> {
        instructions::claim_cashback(ctx)
    }

    pub fn seize_cashback(ctx: Context<SeizeCashback>) -> Result<()> {
        instructions::seize_cashback(ctx)
    }
}
