use crate::{state::*, utils::*};
use anchor_lang::prelude::*;
use anchor_spl::token::TokenAccount;
use mpl_token_metadata::state::Collection;

#[derive(Accounts)]
pub struct ClaimCashback<'info> {
    #[account(mut)]
    user: Signer<'info>,
    #[account(mut, address = bank.load()?.authority)]
    authority: UncheckedAccount<'info>,
    #[account(mut, seeds = [b"bank"], bump)]
    bank: AccountLoader<'info, Bank>,
    #[account(token::authority = user, constraint = nft_account.amount != 0)]
    nft_account: Account<'info, TokenAccount>,
    #[account(
        seeds = [b"metadata", &mpl_token_metadata::ID.to_bytes(), &nft_account.mint.to_bytes()],
        seeds::program = mpl_token_metadata::ID,
        bump,
        constraint = matches!(metadata.collection, Some(Collection { verified: true, .. })),
    )]
    metadata: Account<'info, Metadata>,
    #[account(
        mut,
        seeds = [
            b"cashback",
            &metadata.data.name.as_bytes()[..metadata.data.name.bytes().position(|b| b == 0).unwrap_or(32)],
            &metadata.collection.as_ref().unwrap().key.to_bytes(),
        ],
        bump,
        constraint = (Clock::get()?.unix_timestamp as u32) < cashback.load()?.expiration_date,
        close = authority,
    )]
    cashback: AccountLoader<'info, Cashback>,
    system_program: Program<'info, System>,
}

pub fn claim_cashback(ctx: Context<ClaimCashback>) -> Result<()> {
    let cashback = &mut ctx.accounts.cashback.load_mut()?;

    arithmetic_transfer(
        &ctx.accounts.bank.to_account_info(),
        &ctx.accounts.user.to_account_info(),
        cashback.lamports,
    )?;

    cashback.lamports = 0;

    Ok(())
}
