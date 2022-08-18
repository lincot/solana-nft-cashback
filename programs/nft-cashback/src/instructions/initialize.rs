use crate::state::*;
use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    authority: Signer<'info>,
    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<Bank>(),
        seeds = [b"bank"],
        bump,
    )]
    bank: AccountLoader<'info, Bank>,
    system_program: Program<'info, System>,
}

pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
    ctx.accounts.bank.load_init()?.authority = ctx.accounts.authority.key();

    Ok(())
}
