import {
  PROGRAM_ID as CANDY_MACHINE_PROGRAM_ID,
  createMintNftInstruction,
  CandyMachine,
  createSetCollectionDuringMintInstruction,
  CollectionPDA,
  createInitializeCandyMachineInstruction,
  ConfigLine,
  createAddConfigLinesInstruction,
  createWithdrawFundsInstruction,
  createSetCollectionInstruction,
  WhitelistMintSettings,
  createUpdateCandyMachineInstruction,
  CandyMachineData,
} from "@metaplex-foundation/mpl-candy-machine";
import {
  createCreateMasterEditionV3Instruction,
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
  Transaction,
} from "@solana/web3.js";
import { Context } from "./ctx";
import * as token from "@solana/spl-token";
import { findOrCreateATA } from "./token";
import {
  findCandyMachineCollectionPda,
  findCollectionAuthorityRecordPda,
  findEditionPda,
  findMasterEditionV2Pda,
  findMetadataPda,
} from "@metaplex-foundation/js";

export async function initializeCandyMachine(
  ctx: Context,
  candyMachine: Keypair,
  authority: Keypair,
  price: number,
  symbol: string,
  sellerFeeBasisPoints: number,
  goLiveDate: number,
  whitelistMintSettings: WhitelistMintSettings,
  itemsAvailable: number
): Promise<void> {
  const space =
    725 + itemsAvailable * 240 + 2 * (Math.floor(itemsAvailable / 8) + 1);

  const createCandyMachineIx = SystemProgram.createAccount({
    fromPubkey: authority.publicKey,
    newAccountPubkey: candyMachine.publicKey,
    lamports: await ctx.provider.connection.getMinimumBalanceForRentExemption(
      space
    ),
    space,
    programId: CANDY_MACHINE_PROGRAM_ID,
  });
  const ix = createInitializeCandyMachineInstruction(
    {
      candyMachine: candyMachine.publicKey,
      wallet: authority.publicKey,
      authority: authority.publicKey,
      payer: authority.publicKey,
    },
    {
      data: {
        uuid: "\0\0\0\0\0\0",
        price,
        symbol,
        sellerFeeBasisPoints,
        maxSupply: 0,
        isMutable: false,
        retainAuthority: true,
        goLiveDate,
        endSettings: null,
        creators: [
          {
            address: authority.publicKey,
            verified: true,
            share: 100,
          },
        ],
        hiddenSettings: null,
        whitelistMintSettings,
        itemsAvailable,
        gatekeeper: null,
      },
    }
  );
  const tx = new Transaction().add(createCandyMachineIx, ix);
  await sendAndConfirmTransaction(ctx.provider.connection, tx, [
    authority,
    candyMachine,
  ]);
}

export async function updateCandyMachine(
  ctx: Context,
  candyMachine: PublicKey,
  authority: Keypair,
  data: CandyMachineData
): Promise<void> {
  const ix = createUpdateCandyMachineInstruction(
    {
      candyMachine,
      authority: authority.publicKey,
      wallet: authority.publicKey,
    },
    { data }
  );
  const tx = new Transaction().add(ix);
  await sendAndConfirmTransaction(ctx.provider.connection, tx, [authority]);
}

export async function setCollection(
  ctx: Context,
  candyMachine: PublicKey,
  authority: Keypair,
  name: string,
  symbol: string,
  uri: string
): Promise<PublicKey> {
  const mint = await token.createMint(
    ctx.provider.connection,
    ctx.payer,
    authority.publicKey,
    null,
    0
  );
  await token.mintTo(
    ctx.provider.connection,
    ctx.payer,
    mint,
    await findOrCreateATA(ctx, mint, authority.publicKey),
    authority,
    1
  );

  const metadata = findMetadataPda(mint);
  const edition = findMasterEditionV2Pda(mint);

  const createMetadataIx = createCreateMetadataAccountV3Instruction(
    {
      metadata,
      mint,
      mintAuthority: authority.publicKey,
      payer: authority.publicKey,
      updateAuthority: authority.publicKey,
    },
    {
      createMetadataAccountArgsV3: {
        collectionDetails: null,
        data: {
          name,
          symbol,
          uri,
          sellerFeeBasisPoints: 0,
          creators: [
            { address: authority.publicKey, share: 100, verified: true },
          ],
          collection: null,
          uses: null,
        },
        isMutable: false,
      },
    }
  );

  const createMasterEditionIx = createCreateMasterEditionV3Instruction(
    {
      edition,
      mint,
      updateAuthority: authority.publicKey,
      mintAuthority: authority.publicKey,
      payer: authority.publicKey,
      metadata,
    },
    {
      createMasterEditionArgs: {
        maxSupply: 0,
      },
    }
  );

  const collectionPda = findCandyMachineCollectionPda(candyMachine);
  const collectionAuthorityRecord = findCollectionAuthorityRecordPda(
    mint,
    collectionPda
  );

  const ix = createSetCollectionInstruction({
    candyMachine,
    authority: authority.publicKey,
    collectionPda,
    payer: authority.publicKey,
    metadata,
    mint,
    edition,
    collectionAuthorityRecord,
    tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
  });

  const tx = new Transaction().add(createMetadataIx, createMasterEditionIx, ix);
  await sendAndConfirmTransaction(ctx.provider.connection, tx, [authority]);

  return mint;
}

export async function addConfigLines(
  ctx: Context,
  candyMachine: PublicKey,
  authority: Keypair,
  index: number,
  configLines: ConfigLine[]
): Promise<void> {
  const ix = createAddConfigLinesInstruction(
    {
      candyMachine,
      authority: authority.publicKey,
    },
    {
      index,
      configLines,
    }
  );
  const tx = new Transaction().add(ix);
  await sendAndConfirmTransaction(ctx.provider.connection, tx, [authority]);
}

export async function mintNFT(
  ctx: Context,
  candyMachine: PublicKey,
  authority: Keypair
): Promise<PublicKey> {
  const mint = await token.createMint(
    ctx.provider.connection,
    ctx.payer,
    authority.publicKey,
    null,
    0
  );
  await token.mintTo(
    ctx.provider.connection,
    ctx.payer,
    mint,
    await findOrCreateATA(ctx, mint, authority.publicKey),
    authority,
    1
  );

  const [candyMachineCreator, creatorBump] = await PublicKey.findProgramAddress(
    [Buffer.from("candy_machine"), candyMachine.toBuffer()],
    CANDY_MACHINE_PROGRAM_ID
  );

  const candyMachineAccount = await CandyMachine.fromAccountAddress(
    ctx.provider.connection,
    candyMachine
  );
  const wallet = candyMachineAccount.wallet;

  const metadata = findMetadataPda(mint);
  const masterEdition = findMasterEditionV2Pda(mint);

  let tx = new Transaction();

  const ix = createMintNftInstruction(
    {
      candyMachine,
      candyMachineCreator,
      payer: authority.publicKey,
      wallet,
      metadata,
      mint,
      mintAuthority: authority.publicKey,
      updateAuthority: authority.publicKey,
      masterEdition,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      clock: SYSVAR_CLOCK_PUBKEY,
      recentBlockhashes: SYSVAR_RECENT_BLOCKHASHES_PUBKEY,
      instructionSysvarAccount: SYSVAR_INSTRUCTIONS_PUBKEY,
    },
    {
      creatorBump,
    }
  );

  if (candyMachineAccount.data.whitelistMintSettings) {
    ix.keys = ix.keys.concat([
      {
        pubkey: await findOrCreateATA(
          ctx,
          candyMachineAccount.data.whitelistMintSettings.mint,
          authority.publicKey
        ),
        isSigner: false,
        isWritable: false,
      },
    ]);
  }

  tx = tx.add(ix);

  if (candyMachineAccount.data.uuid[0] === "1") {
    const collectionPda = findCandyMachineCollectionPda(candyMachine);
    const collectionMint = (
      await CollectionPDA.fromAccountAddress(
        ctx.provider.connection,
        collectionPda
      )
    ).mint;
    const collectionMetadata = findMetadataPda(collectionMint);
    const collectionMasterEdition = findEditionPda(collectionMint);
    const collectionAuthorityRecord = findCollectionAuthorityRecordPda(
      collectionMint,
      collectionPda
    );

    const setCollectionDuringMintIx = createSetCollectionDuringMintInstruction({
      candyMachine,
      metadata,
      payer: authority.publicKey,
      collectionPda,
      tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      collectionMint,
      collectionMetadata,
      collectionMasterEdition,
      authority: candyMachineAccount.authority,
      collectionAuthorityRecord,
    });

    tx = tx.add(setCollectionDuringMintIx);
  }

  await sendAndConfirmTransaction(ctx.provider.connection, tx, [authority]);

  return mint;
}

export async function withdrawFunds(
  ctx: Context,
  candyMachine: PublicKey,
  authority: Keypair
): Promise<void> {
  const ix = createWithdrawFundsInstruction({
    candyMachine,
    authority: authority.publicKey,
  });
  const tx = new Transaction().add(ix);
  await sendAndConfirmTransaction(ctx.provider.connection, tx, [authority]);
}
