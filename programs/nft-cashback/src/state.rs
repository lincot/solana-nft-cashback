use anchor_lang::prelude::*;
use std::ops::Deref;

#[account(zero_copy)]
pub struct Bank {
    pub authority: Pubkey,
}

#[account(zero_copy)]
#[repr(packed)]
pub struct Cashback {
    pub nft_name: [u8; 32],
    pub nft_collection: Pubkey,
    pub lamports: u64,
    pub expiration_date: u32,
}

#[derive(Clone)]
pub struct Metadata(mpl_token_metadata::state::Metadata);

impl Metadata {
    pub const LEN: usize = mpl_token_metadata::state::MAX_METADATA_LEN;
}

impl anchor_lang::AccountDeserialize for Metadata {
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        mpl_token_metadata::state::Metadata::deserialize(buf)
            .map(Metadata)
            .map_err(Into::into)
    }
}

impl anchor_lang::AccountSerialize for Metadata {}

impl anchor_lang::Owner for Metadata {
    fn owner() -> Pubkey {
        mpl_token_metadata::ID
    }
}

impl Deref for Metadata {
    type Target = mpl_token_metadata::state::Metadata;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}
