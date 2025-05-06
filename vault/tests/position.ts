import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, LAMPORTS_PER_SOL, Keypair, Transaction } from "@solana/web3.js";
import { assert } from "chai";
import { Vault } from "../target/types/vault";
import { HermesClient } from "@pythnetwork/hermes-client";
import { PythSolanaReceiver } from "@pythnetwork/pyth-solana-receiver";

describe("Volatility Trading Position Tests with Pyth SDK", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Vault as Program<Vault>;
  const user = (provider.wallet as anchor.Wallet).payer;

  // Test accounts and variables
  let vaultState: PublicKey;
  let vaultStateBump: number;
  let vault: PublicKey;
  let vaultBump: number;
  let orderId = 12345;
  let position: PublicKey;
  let positionBump: number;
  
  // BTC/USD price feed ID from Pyth
  const BTC_USD_PRICE_FEED_ID = "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43";
  
  // Pyth client setup
  const hermesClient = new HermesClient("https://hermes.pyth.network/", {});
  const pythSolanaReceiver = new PythSolanaReceiver({ 
    connection: provider.connection, 
    wallet: provider.wallet as anchor.Wallet 
  });
  
  // Price update account
  let priceUpdateAccount: PublicKey;
  
  // Position parameters
  const amount = LAMPORTS_PER_SOL; // 1 SOL
  const lowerBound = 50000 * 10**6; // $50,000 (with 6 decimals)
  const upperBound = 60000 * 10**6; // $60,000 (with 6 decimals)
  
  // Helper function to advance blockchain time (for testing only)
  const advanceTime = async (secondsToAdd: number) => {
    console.log(`[Mock] Advancing time by ${secondsToAdd} seconds`);
    // This is a mock function - in a real test, you can't advance time on Solana
  };

  it("Initializes PDAs and fetches price feed", async () => {
    // Initialize vault state PDA
    const [vaultStateAddress, vaultStateAddressBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault_state"), user.publicKey.toBuffer()],
      program.programId
    );
    vaultState = vaultStateAddress;
    vaultStateBump = vaultStateAddressBump;
    
    // Initialize vault PDA
    const [vaultAddress, vaultAddressBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), vaultState.toBuffer()],
      program.programId
    );
    vault = vaultAddress;
    vaultBump = vaultAddressBump;
    
    // Initialize position PDA
    const [positionAddress, positionAddressBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        user.publicKey.toBuffer(),
        new anchor.BN(orderId).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );
    position = positionAddress;
    positionBump = positionAddressBump;
    
    // Fetch the latest BTC/USD price update from Hermes
    const priceUpdateData = (
      await hermesClient.getLatestPriceUpdates(
        [BTC_USD_PRICE_FEED_ID],
        { encoding: "base64" }
      )
    ).binary.data;
    
    console.log("Fetched price update data from Hermes");

    // Post the price update to Solana and get the price update account
    const transactionBuilder = pythSolanaReceiver.newTransactionBuilder({
      closeUpdateAccounts: false, // Keep the account open for our tests
    });
    
    await transactionBuilder.addPostPriceUpdates(priceUpdateData);
    
    // Get the price update account address
    priceUpdateAccount = await transactionBuilder.getPriceUpdateAccount(BTC_USD_PRICE_FEED_ID);
    
    // Send the transaction to post the price update
    await pythSolanaReceiver.provider.sendAll(
      await transactionBuilder.buildVersionedTransactions({
        computeUnitPriceMicroLamports: 50000,
      }),
      { skipPreflight: true }
    );
    
    console.log("PDAs and price feed initialized");
    console.log(`Vault State: ${vaultState.toString()}`);
    console.log(`Vault: ${vault.toString()}`);
    console.log(`Price Update Account: ${priceUpdateAccount.toString()}`);
    console.log(`Program ID: ${program.programId.toString()}`);
    
    // Verify the PDAs were initialized correctly
    assert.ok(vaultState, "Vault state was not initialized correctly");
    assert.ok(vault, "Vault was not initialized correctly");
    assert.ok(position, "Position was not initialized correctly");
    assert.ok(priceUpdateAccount, "Price update account was not initialized correctly");

    // Fund user account to ensure there's enough SOL for all tests
    // await provider.connection.requestAirdrop(user.publicKey, 10 * LAMPORTS_PER_SOL);
    // Wait a moment for airdrop to be confirmed
    await new Promise(resolve => setTimeout(resolve, 2000));
  });

  it("Initializes the vault", async () => {
    await program.methods
      .initialize()
      .accounts({
        user: user.publicKey,
        vaultState: vaultState,
        vault: vault,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
      
    // Verify vault state was created
    const vaultStateAccount = await program.account.vaultState.fetch(vaultState);
    assert.equal(vaultStateAccount.authority.toString(), user.publicKey.toString());
    assert.equal(vaultStateAccount.stateBump, vaultStateBump);
    assert.equal(vaultStateAccount.vaultBump, vaultBump);
    
    console.log("Vault initialized successfully");
  });

  it("Creates a StayIn position", async () => {
    // Get balances before
    const userBalanceBefore = await provider.connection.getBalance(user.publicKey);
    const vaultBalanceBefore = await provider.connection.getBalance(vault);
    
    await program.methods
      .createPosition(
        { stayIn: {} }, // PositionType enum, using StayIn variant
        new anchor.BN(lowerBound),
        new anchor.BN(upperBound),
        new anchor.BN(orderId),
        new anchor.BN(amount)
      )
      .accounts({
        user: user.publicKey,
        position: position,
        vault: vault,
        vaultState: vaultState,
        priceUpdate: priceUpdateAccount, // Use the Pyth price update account
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
      
    // Verify position was created
    const positionAccount = await program.account.positionState.fetch(position);
    assert.equal(positionAccount.user.toString(), user.publicKey.toString());
    assert.deepEqual(positionAccount.positionType, { stayIn: {} });
    assert.equal(positionAccount.lowerBound.toString(), lowerBound.toString());
    assert.equal(positionAccount.upperBound.toString(), upperBound.toString());
    assert.equal(positionAccount.orderId.toString(), orderId.toString());
    assert.equal(positionAccount.amount.toString(), amount.toString());
    assert.equal(positionAccount.status.active !== undefined, true);
    assert.equal(positionAccount.bump, positionBump);
    
    // Verify SOL transfer
    const userBalanceAfter = await provider.connection.getBalance(user.publicKey);
    const vaultBalanceAfter = await provider.connection.getBalance(vault);
    
    // Account for transaction fees (roughly) - using a more lenient check
    const userBalanceDiff = userBalanceBefore - userBalanceAfter - amount;
    assert.isTrue(
      userBalanceDiff >= 0 && userBalanceDiff < 2000000,
      `User balance difference (${userBalanceDiff}) should be positive and less than 2000000 lamports`
    );
    
    assert.equal(
      vaultBalanceAfter - vaultBalanceBefore,
      amount,
      "Vault balance should increase by position amount"
    );
    
    console.log("StayIn position created successfully");
  });

  it("Checks position status with real price feed", async () => {
    // Since check_position takes an order_id in the instruction context but not as a direct
    // argument, we need to manually append it to the instruction data
    await program.methods
      .checkPosition()
      .accounts({
        user: user.publicKey,
        position: position,
        priceUpdate: priceUpdateAccount, // Use the Pyth price update account
      })
      .instruction()
      .then(async ix => {
        // Add the order_id to the instruction data
        const orderIdBuffer = Buffer.alloc(8);
        orderIdBuffer.writeBigUInt64LE(BigInt(orderId), 0);
        
        // Create a new instruction with the modified data
        const newIx = {
          ...ix,
          data: Buffer.concat([ix.data, orderIdBuffer])
        };
        
        // Send the transaction with the modified instruction
        const tx = new anchor.web3.Transaction().add(newIx);
        await provider.sendAndConfirm(tx);
      });
      
    // Fetch the position to check its status
    const positionAccount = await program.account.positionState.fetch(position);
    console.log("Position status after check:", positionAccount.status);
    
    // If the price is within the range, it should still be active
    // If the price is outside the range, it should be settled
    if ('active' in positionAccount.status) {
      console.log("Position is still active - price is within range");
    } else if ('settled' in positionAccount.status) {
      console.log("Position has been settled - price is outside range");
      console.log(`Payout percentage: ${positionAccount.settlementData.payoutPercentage}%`);
    }
  });

  it("Fetches new price updates to simulate price movement", async () => {
    // In a real scenario, we would wait for the price to move naturally
    // For testing, we can fetch a new price update and post it
    
    // Fetch a new price update
    const priceUpdateData = (
      await hermesClient.getLatestPriceUpdates(
        [BTC_USD_PRICE_FEED_ID],
        { encoding: "base64" }
      )
    ).binary.data;
    
    // Post the new price update
    const transactionBuilder = pythSolanaReceiver.newTransactionBuilder({
      closeUpdateAccounts: false,
    });
    
    await transactionBuilder.addPostPriceUpdates(priceUpdateData);
    
    // Send the transaction to post the price update
    await pythSolanaReceiver.provider.sendAll(
      await transactionBuilder.buildVersionedTransactions({
        computeUnitPriceMicroLamports: 50000,
      }),
      { skipPreflight: true }
    );
    
    console.log("Updated price feed with the latest data");
    
    // Check the position status with the new price
    await program.methods
      .checkPosition()
      .accounts({
        user: user.publicKey,
        position: position,
        priceUpdate: priceUpdateAccount,
      })
      .instruction()
      .then(async ix => {
        const orderIdBuffer = Buffer.alloc(8);
        orderIdBuffer.writeBigUInt64LE(BigInt(orderId), 0);
        
        const newIx = {
          ...ix,
          data: Buffer.concat([ix.data, orderIdBuffer])
        };
        
        const tx = new anchor.web3.Transaction().add(newIx);
        await provider.sendAndConfirm(tx);
      });
      
    // Fetch the position to check its status after the price update
    const positionAccount = await program.account.positionState.fetch(position);
    console.log("Position status after price update:", positionAccount.status);
    
    if ('active' in positionAccount.status) {
      console.log("Position is still active - new price is within range");
    } else if ('settled' in positionAccount.status) {
      console.log("Position has been settled - new price is outside range");
      console.log(`Payout percentage: ${positionAccount.settlementData.payoutPercentage}%`);
    }
  });

  it("Claims position if settled", async () => {
    // First check if the position is settled
    const positionBeforeClaim = await program.account.positionState.fetch(position);
    
    // Only attempt to claim if the position is settled
    if ('settled' in positionBeforeClaim.status) {
      // Similar approach to add the order_id to the instruction
      await program.methods
        .claimPosition()
        .accounts({
          user: user.publicKey,
          position: position,
          vault: vault,
          vaultState: vaultState,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .instruction()
        .then(async ix => {
          const orderIdBuffer = Buffer.alloc(8);
          orderIdBuffer.writeBigUInt64LE(BigInt(orderId), 0);
          
          const newIx = {
            ...ix,
            data: Buffer.concat([ix.data, orderIdBuffer])
          };
          
          const tx = new anchor.web3.Transaction().add(newIx);
          await provider.sendAndConfirm(tx);
        });
        
      // Verify position is now claimed
      const positionAfterClaim = await program.account.positionState.fetch(position);
      assert.equal('claimed' in positionAfterClaim.status, true, "Position should be claimed");
      
      console.log("Position claimed successfully");
    } else {
      console.log("Position is not settled yet, skipping claim");
    }
  });

  it("Creates a Breakout position", async () => {
    // Use a new order ID for this position
    const breakoutOrderId = 67890;
    
    // Find the new position PDA
    const [breakoutPosition, breakoutPositionBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("position"),
        user.publicKey.toBuffer(),
        new anchor.BN(breakoutOrderId).toArrayLike(Buffer, "le", 8)
      ],
      program.programId
    );
    
    // Create a Breakout position
    await program.methods
      .createPosition(
        { breakout: {} }, // PositionType enum, using Breakout variant
        new anchor.BN(lowerBound),
        new anchor.BN(upperBound),
        new anchor.BN(breakoutOrderId),
        new anchor.BN(amount)
      )
      .accounts({
        user: user.publicKey,
        position: breakoutPosition,
        vault: vault,
        vaultState: vaultState,
        priceUpdate: priceUpdateAccount, // Use the Pyth price update account
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
      
    // Verify position was created
    const positionAccount = await program.account.positionState.fetch(breakoutPosition);
    assert.equal(positionAccount.user.toString(), user.publicKey.toString());
    assert.deepEqual(positionAccount.positionType, { breakout: {} });
    
    console.log("Breakout position created successfully");
    
    // In a real test, we would wait for the price to break out of the range
    // For now, we'll just check the position status
    await program.methods
      .checkPosition()
      .accounts({
        user: user.publicKey,
        position: breakoutPosition,
        priceUpdate: priceUpdateAccount,
      })
      .instruction()
      .then(async ix => {
        const orderIdBuffer = Buffer.alloc(8);
        orderIdBuffer.writeBigUInt64LE(BigInt(breakoutOrderId), 0);
        
        const newIx = {
          ...ix,
          data: Buffer.concat([ix.data, orderIdBuffer])
        };
        
        const tx = new anchor.web3.Transaction().add(newIx);
        await provider.sendAndConfirm(tx);
      });
      
    // Fetch the position status
    const breakoutPositionStatus = await program.account.positionState.fetch(breakoutPosition);
    console.log("Breakout position status:", breakoutPositionStatus.status);
  });
});