use crate::{state::*, utils::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(nft_name: String, nft_collection: Pubkey)]
pub struct CreateCashback<'info> {
    #[account(mut, address = bank.load()?.authority)]
    authority: Signer<'info>,
    #[account(mut, seeds = [b"bank"], bump)]
    bank: AccountLoader<'info, Bank>,
    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<Cashback>(),
        seeds = [b"cashback", nft_name.as_bytes(), &nft_collection.to_bytes()],
        bump,
    )]
    cashback: AccountLoader<'info, Cashback>,
    system_program: Program<'info, System>,
}

pub fn create_cashback(
    ctx: Context<CreateCashback>,
    _nft_name: String,
    _nft_collection: Pubkey,
    lamports: u64,
    expiration_date: u32,
) -> Result<()> {
    let cashback = &mut ctx.accounts.cashback.load_init()?;
    cashback.lamports = lamports;
    cashback.expiration_date = expiration_date;

    system_transfer(
        &ctx.accounts.authority.to_account_info(),
        &ctx.accounts.bank.to_account_info(),
        lamports,
    )?;

    Ok(())
}
