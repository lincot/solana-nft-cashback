use crate::{state::*, utils::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct SeizeCashback<'info> {
    #[account(mut, address = bank.load()?.authority)]
    authority: Signer<'info>,
    #[account(mut, seeds = [b"bank"], bump)]
    bank: AccountLoader<'info, Bank>,
    #[account(
        mut,
        close = authority,
        constraint = Clock::get()?.unix_timestamp as u32 >= cashback.load()?.expiration_date,
    )]
    cashback: AccountLoader<'info, Cashback>,
    system_program: Program<'info, System>,
}

pub fn seize_cashback(ctx: Context<SeizeCashback>) -> Result<()> {
    arithmetic_transfer(
        &ctx.accounts.bank.to_account_info(),
        &ctx.accounts.authority.to_account_info(),
        ctx.accounts.cashback.load()?.lamports,
    )?;

    Ok(())
}
