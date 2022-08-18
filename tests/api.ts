import { BN } from "@project-serum/anchor";
import {
  SystemProgram,
  Keypair,
  PublicKey,
  TransactionSignature,
} from "@solana/web3.js";
import { Context } from "./ctx";

export function findCashback(ctx: Context, nftName: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("cashback"), Buffer.from(nftName)],
    ctx.program.programId
  )[0];
}

export async function initialize(ctx: Context): Promise<TransactionSignature> {
  return await ctx.program.methods
    .initialize()
    .accounts({
      authority: ctx.authority.publicKey,
      bank: ctx.bank,
      systemProgram: SystemProgram.programId,
    })
    .signers([ctx.authority])
    .rpc();
}

export async function createCashback(
  ctx: Context,
  nftName: string,
  nftCollection: PublicKey,
  lamports: number | BN,
  expirationDate: number
): Promise<TransactionSignature> {
  return await ctx.program.methods
    .createCashback(nftName, nftCollection, new BN(lamports), expirationDate)
    .accounts({
      authority: ctx.authority.publicKey,
      bank: ctx.bank,
      cashback: findCashback(ctx, nftName),
      systemProgram: SystemProgram.programId,
    })
    .signers([ctx.authority])
    .rpc();
}

export async function claimCashback(
  ctx: Context,
  user: Keypair,
  nftAccount: PublicKey,
  metadata: PublicKey,
  cashback: PublicKey
): Promise<TransactionSignature> {
  return await ctx.program.methods
    .claimCashback()
    .accounts({
      user: user.publicKey,
      bank: ctx.bank,
      nftAccount,
      metadata,
      cashback,
      systemProgram: SystemProgram.programId,
    })
    .signers([user])
    .rpc();
}

export async function seizeCashback(
  ctx: Context,
  cashback: PublicKey
): Promise<TransactionSignature> {
  return await ctx.program.methods
    .seizeCashback()
    .accounts({
      authority: ctx.authority.publicKey,
      bank: ctx.bank,
      cashback,
      systemProgram: SystemProgram.programId,
    })
    .signers([ctx.authority])
    .rpc();
}
