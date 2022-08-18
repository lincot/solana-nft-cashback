import * as chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { Context } from "./ctx";
import {
  findCashback,
  initialize,
  createCashback,
  claimCashback,
  seizeCashback,
} from "./api";
import { Keypair, PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import {
  addConfigLines,
  initializeCandyMachine,
  mintNFT,
  setCollection,
  updateCandyMachine,
} from "./candyMachine";
import { findOrCreateATA } from "./token";
import { findMetadataPda } from "@metaplex-foundation/js";
import { Metadata } from "@metaplex-foundation/mpl-token-metadata";
import {
  CandyMachine,
  WhitelistMintMode,
} from "@metaplex-foundation/mpl-candy-machine";

chai.use(chaiAsPromised);

const ctx = new Context();

before(async () => {
  await ctx.setup();
});

let candyMachine: PublicKey;
let collectionMint: PublicKey;
let mint1: PublicKey;
let name1: string;
let mint2: PublicKey;
let name2: string;

describe("Candy Machine", () => {
  it("InitializeCandyMachine", async () => {
    const candyMachineKeypair = new Keypair();
    candyMachine = candyMachineKeypair.publicKey;

    await initializeCandyMachine(
      ctx,
      candyMachineKeypair,
      ctx.authority,
      1_000_000,
      "YES",
      100,
      +new Date() / 1000,
      {
        discountPrice: null,
        mint: ctx.presaleWhitelist,
        mode: WhitelistMintMode.NeverBurn,
        presale: false,
      },
      3
    );
  });

  it("SetCollection", async () => {
    collectionMint = await setCollection(
      ctx,
      candyMachine,
      ctx.authority,
      "Crypto Demons Collection",
      "CDC",
      "https://fakeuri"
    );
  });

  it("AddConfigLines", async () => {
    await addConfigLines(ctx, candyMachine, ctx.authority, 0, [
      { name: "Crypto Demon 1", uri: "https://fakeuri" },
      { name: "Crypto Demon 2", uri: "https://fakeuri" },
      { name: "Crypto Demon 3", uri: "https://fakeuri" },
    ]);
  });

  it("MintNFT", async () => {
    await ctx.addToPresaleWhitelist(ctx.user1.publicKey);

    [mint1, mint2] = await Promise.all([
      mintNFT(ctx, candyMachine, ctx.user1),
      mintNFT(ctx, candyMachine, ctx.user1),
    ]);
    const metadata1 = await Metadata.fromAccountAddress(
      ctx.provider.connection,
      findMetadataPda(mint1)
    );
    name1 = metadata1.data.name.slice(0, metadata1.data.name.indexOf("\0"));
    const metadata2 = await Metadata.fromAccountAddress(
      ctx.provider.connection,
      findMetadataPda(mint2)
    );
    name2 = metadata2.data.name.slice(0, metadata1.data.name.indexOf("\0"));
  });

  it("UpdateCandyMachine", async () => {
    const candyMachineAccount = await CandyMachine.fromAccountAddress(
      ctx.provider.connection,
      candyMachine
    );
    let data = candyMachineAccount.data;
    data.whitelistMintSettings = {
      discountPrice: null,
      mint: ctx.publicWhitelist,
      mode: WhitelistMintMode.NeverBurn,
      presale: false,
    };
    await updateCandyMachine(ctx, candyMachine, ctx.authority, data);

    await ctx.addToPublicWhitelist(ctx.user2.publicKey);

    await mintNFT(ctx, candyMachine, ctx.user2);
  });
});

describe("NFT Cashback", () => {
  it("Initialize", async () => {
    await initialize(ctx);

    const bank = await ctx.program.account.bank.fetch(ctx.bank);
    expect(bank.authority).to.eql(ctx.authority.publicKey);
  });

  it("CreateCashback", async () => {
    const lamports = 100_000;
    const expirationDate = (+new Date() / 1000 + 5) | 0;

    await createCashback(ctx, name1, collectionMint, lamports, expirationDate);

    const cashback = await ctx.program.account.cashback.fetch(
      findCashback(ctx, name1)
    );
    const nftNameArray = [
      0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      0, 0, 0, 0, 0, 0, 0,
    ];
    const nftNameBuffer = Buffer.from(name1);
    for (let i = 0; i < nftNameBuffer.length; i++) {
      nftNameArray[i] = nftNameBuffer[i];
    }
    expect(cashback.nftName).to.eql(nftNameArray);
    expect(cashback.lamports.toNumber()).to.eql(lamports);
    expect(cashback.expirationDate).to.eql(expirationDate);

    await createCashback(
      ctx,
      name2,
      collectionMint,
      lamports,
      +new Date() / 1000
    );
  });

  it("ClaimCashback", async () => {
    await claimCashback(
      ctx,
      ctx.user1,
      await findOrCreateATA(ctx, mint1, ctx.user1.publicKey),
      findMetadataPda(mint1),
      findCashback(ctx, name1)
    );
  });

  it("SeizeCashback", async () => {
    await seizeCashback(ctx, findCashback(ctx, name2));
  });
});
