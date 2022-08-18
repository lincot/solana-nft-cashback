import * as anchor from "@project-serum/anchor";
import { Program, AnchorProvider } from "@project-serum/anchor";
import NodeWallet from "@project-serum/anchor/dist/cjs/nodewallet";
import { Keypair, PublicKey } from "@solana/web3.js";
import { NftCashback } from "../target/types/nft_cashback";
import { airdrop } from "./utils";
import * as token from "@solana/spl-token";
import { findOrCreateATA } from "./token";

export class Context {
  provider: AnchorProvider;

  program: Program<NftCashback>;

  payer: Keypair;

  authority: Keypair;

  user1: Keypair;
  user2: Keypair;

  bank: PublicKey;

  presaleWhitelist: PublicKey;
  publicWhitelist: PublicKey;

  constructor() {
    this.provider = anchor.AnchorProvider.env();
    anchor.setProvider(this.provider);
    this.program = anchor.workspace.NftCashback;
    this.payer = (this.provider.wallet as NodeWallet).payer;

    this.authority = new Keypair();
    this.user1 = new Keypair();
    this.user2 = new Keypair();

    this.bank = PublicKey.findProgramAddressSync(
      [Buffer.from("bank")],
      this.program.programId
    )[0];
  }

  async setup(): Promise<void> {
    await airdrop(this, [
      this.authority.publicKey,
      this.user1.publicKey,
      this.user2.publicKey,
    ]);

    this.presaleWhitelist = await token.createMint(
      this.provider.connection,
      this.payer,
      this.authority.publicKey,
      this.authority.publicKey,
      0
    );
    this.publicWhitelist = await token.createMint(
      this.provider.connection,
      this.payer,
      this.authority.publicKey,
      this.authority.publicKey,
      0
    );
  }

  async addToPresaleWhitelist(user: PublicKey): Promise<void> {
    await token.mintTo(
      this.provider.connection,
      this.payer,
      this.presaleWhitelist,
      await findOrCreateATA(this, this.presaleWhitelist, user),
      this.authority,
      1
    );
    await token.freezeAccount(
      this.provider.connection,
      this.payer,
      await findOrCreateATA(this, this.presaleWhitelist, user),
      this.presaleWhitelist,
      this.authority
    );
  }

  async addToPublicWhitelist(user: PublicKey): Promise<void> {
    await token.mintTo(
      this.provider.connection,
      this.payer,
      this.publicWhitelist,
      await findOrCreateATA(this, this.publicWhitelist, user),
      this.authority,
      1
    );
    await token.freezeAccount(
      this.provider.connection,
      this.payer,
      await findOrCreateATA(this, this.publicWhitelist, user),
      this.publicWhitelist,
      this.authority
    );
  }
}
