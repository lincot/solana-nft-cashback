use anchor_lang::prelude::*;
use solana_program::{program::invoke, system_instruction};

pub fn arithmetic_transfer(from: &AccountInfo, to: &AccountInfo, lamports: u64) -> Result<()> {
    **from.try_borrow_mut_lamports()? = (from.lamports())
        .checked_sub(lamports)
        .ok_or(ProgramError::InsufficientFunds)?;
    **to.try_borrow_mut_lamports()? += lamports;
    Ok(())
}

pub fn system_transfer<'info>(
    from: &AccountInfo<'info>,
    to: &AccountInfo<'info>,
    lamports: u64,
) -> Result<()> {
    invoke(
        &system_instruction::transfer(&from.key(), &to.key(), lamports),
        &[from.to_account_info(), to.to_account_info()],
    )?;
    Ok(())
}
