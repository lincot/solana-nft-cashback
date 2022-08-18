use crate::{state::*, utils::*};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(nft_name: String)]
pub struct CreateCashback<'info> {
    #[account(mut, address = bank.load()?.authority)]
    authority: Signer<'info>,
    #[account(mut, seeds = [b"bank"], bump)]
    bank: AccountLoader<'info, Bank>,
    #[account(
        init,
        payer = authority,
        space = 8 + std::mem::size_of::<Cashback>(),
        seeds = [b"cashback", nft_name.as_bytes()],
        bump,
    )]
    cashback: AccountLoader<'info, Cashback>,
    system_program: Program<'info, System>,
}

pub fn create_cashback(
    ctx: Context<CreateCashback>,
    nft_name: String,
    nft_collection: Pubkey,
    lamports: u64,
    expiration_date: u32,
) -> Result<()> {
    let cashback = &mut ctx.accounts.cashback.load_init()?;
    cashback.nft_name[..nft_name.len()].copy_from_slice(nft_name.as_bytes());
    cashback.nft_collection = nft_collection;
    cashback.lamports = lamports;
    cashback.expiration_date = expiration_date;

    system_transfer(
        &ctx.accounts.authority.to_account_info(),
        &ctx.accounts.bank.to_account_info(),
        lamports,
    )?;

    Ok(())
}
