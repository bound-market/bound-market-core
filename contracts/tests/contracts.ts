import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { BN } from "bn.js";
import { expect } from "chai";
import { Contracts } from "../target/types/contracts";
import { PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("Bound Market Contracts", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Contracts as Program<Contracts>;
  const [contractsPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("contracts")],
    program.programId,
  );

  // Asset type for orderbook
  const ASSET_TYPE = 1; // Asset type (e.g., 1 for ETH)
  
  // Test accounts
  const trader1 = anchor.web3.Keypair.generate();
  const trader2 = anchor.web3.Keypair.generate();
  const oracle = anchor.web3.Keypair.generate(); // Oracle account

  // Sequence number for orders - will be incremented by the program
  let nextSequenceNumber = 1;
  
  // Use PDA for orderbook based on asset type
  const [orderbookPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("orderbook"), Buffer.from([ASSET_TYPE])],
    program.programId
  );

  // Create PDAs for trader states
  const [trader1State] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("trader"), trader1.publicKey.toBuffer()],
    program.programId
  );

  const [trader2State] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("trader"), trader2.publicKey.toBuffer()],
    program.programId
  );

  // Create PDAs for order collections
  const [stayInOrdersPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("stay_in_orders"), orderbookPda.toBuffer()],
    program.programId
  );

  const [breakoutOrdersPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("breakout_orders"), orderbookPda.toBuffer()],
    program.programId
  );

  // Variables to store order accounts for later tests
  let stayInOrderPda: PublicKey;
  let breakoutOrderPda: PublicKey;
  let positionOrderPda: PublicKey;

  // Initial test values
  const INITIAL_PRICE = new BN(50000 * 1e6); // Initial price in lamports (50,000 USDC with 6 decimals)
  const WIDTH_PERCENTAGE = 1.0; // Using 1% for width percentage - must be within min/max range
  const ORDER_AMOUNT = new BN(LAMPORTS_PER_SOL); // 1 SOL worth of order
  
  // Helper function to convert sequence number to buffer
  function getSequenceBuffer(sequence: number): Buffer {
    return Buffer.from(new BN(sequence).toArray('le', 8));
  }
  
  before(async () => {
    // Airdrop SOL to test accounts
    const airdropSig1 = await provider.connection.requestAirdrop(trader1.publicKey, 10 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(airdropSig1);
    
    const airdropSig2 = await provider.connection.requestAirdrop(trader2.publicKey, 10 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(airdropSig2);
  });

  it("Initializes an orderbook", async () => {
    try {
      const tx = await program.methods
        .initialize(ASSET_TYPE)
        .accounts({
          authority: provider.wallet.publicKey,
          orderbook: orderbookPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
        
      console.log("Orderbook initialized with transaction:", tx);
      
      // Get orderbook to check min/max width percentage values
      const orderbook = await program.account.passageOrderbook.fetch(orderbookPda);
      console.log("Min width percentage:", orderbook.minPercentageWidth);
      console.log("Max width percentage:", orderbook.maxPercentageWidth);
    } catch (error) {
      console.error("Error initializing orderbook:", error);
    }
  });

  it("Updates the price", async () => {
    try {
      const tx = await program.methods
        .updatePrice(INITIAL_PRICE)
        .accounts({
          authority: provider.wallet.publicKey,
          orderbook: orderbookPda,
          oracle: oracle.publicKey,
        })
        .rpc();
        
      console.log("Price updated with transaction:", tx);
    } catch (error) {
      console.error("Error updating price:", error);
    }
  });

  it("Registers traders", async () => {
    const initialFunds = new BN(5 * LAMPORTS_PER_SOL); // 5 SOL worth of funds

    try {
      // Register first trader
      const tx1 = await program.methods
        .registerTrader(initialFunds)
        .accounts({
          trader: trader1.publicKey,
          traderState: trader1State,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([trader1])
        .rpc();
      
      console.log("Trader 1 registered with transaction:", tx1);
      
      // Register second trader
      const tx2 = await program.methods
        .registerTrader(initialFunds)
        .accounts({
          trader: trader2.publicKey,
          traderState: trader2State,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([trader2])
        .rpc();
        
      console.log("Trader 2 registered with transaction:", tx2);
    } catch (error) {
      console.error("Error registering traders:", error);
    }
  });

  it("Places a StayIn order", async () => {
    try {
      // Create the correct PDA for the order using the sequence number
      const [orderPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("order"),
          trader1.publicKey.toBuffer(),
          getSequenceBuffer(nextSequenceNumber)
        ],
        program.programId
      );
      
      stayInOrderPda = orderPda;

      const tx = await program.methods
        .placeStayInOrder(WIDTH_PERCENTAGE, ORDER_AMOUNT)
        .accounts({
          trader: trader1.publicKey,
          traderState: trader1State,
          orderbook: orderbookPda,
          order: orderPda,
          stayInOrders: stayInOrdersPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([trader1])
        .rpc();
        
      console.log("StayIn order placed with transaction:", tx);
      nextSequenceNumber++; // Increment for next order
    } catch (error) {
      console.error("Error placing StayIn order:", error);
    }
  });

  it("Places a Breakout order", async () => {
    try {
      // Create the correct PDA for the order using the sequence number
      const [orderPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("order"),
          trader1.publicKey.toBuffer(),
          getSequenceBuffer(nextSequenceNumber)
        ],
        program.programId
      );
      
      breakoutOrderPda = orderPda;

      const tx = await program.methods
        .placeBreakoutOrder(WIDTH_PERCENTAGE, ORDER_AMOUNT)
        .accounts({
          trader: trader1.publicKey,
          traderState: trader1State,
          orderbook: orderbookPda,
          order: orderPda,
          breakoutOrders: breakoutOrdersPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([trader1])
        .rpc();
        
      console.log("Breakout order placed with transaction:", tx);
      nextSequenceNumber++; // Increment for next order
    } catch (error) {
      console.error("Error placing Breakout order:", error);
    }
  });

  it("Matches a position order", async () => {
    try {
      // Order type 0 for a StayIn position
      const orderType = 0; 
      
      // Generate position order PDA with the sequence number
      const [posOrderPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("order"),
          trader2.publicKey.toBuffer(),
          getSequenceBuffer(nextSequenceNumber)
        ],
        program.programId
      );
      
      positionOrderPda = posOrderPda;
      
      const tx = await program.methods
        .matchPositionOrder(orderType, WIDTH_PERCENTAGE, ORDER_AMOUNT)
        .accounts({
          trader: trader2.publicKey,
          traderState: trader2State,
          funderState: trader1State,
          funder: trader1.publicKey,
          orderbook: orderbookPda,
          liquidityOrder: breakoutOrderPda,
          positionOrder: posOrderPda,
          liquidityOrders: breakoutOrdersPda,
          systemProgram: anchor.web3.SystemProgram.programId,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .signers([trader2])
        .rpc();
        
      console.log("Position order matched with transaction:", tx);
      nextSequenceNumber++; // Increment for next order
    } catch (error) {
      console.error("Error matching position order:", error);
    }
  });

  it("Cancels an order", async () => {
    try {
      // Determine which orders collection to use based on the order type
      const tx = await program.methods
        .cancelOrder()
        .accounts({
          trader: trader1.publicKey,
          traderState: trader1State,
          order: stayInOrderPda,
          orderbook: orderbookPda,
          ordersPda: stayInOrdersPda,
        })
        .signers([trader1])
        .rpc();
        
      console.log("Order cancelled with transaction:", tx);
    } catch (error) {
      console.error("Error cancelling order:", error);
    }
  });

  it("Processes expired orders", async () => {
    try {
      // Process the breakout order
      const orders = [breakoutOrderPda];
      
      const tx = await program.methods
        .processExpiredOrders(orders)
        .accounts({
          authority: provider.wallet.publicKey,
          orderbook: orderbookPda,
          orders: breakoutOrdersPda,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();
        
      console.log("Expired orders processed with transaction:", tx);
    } catch (error) {
      console.error("Error processing expired orders:", error);
    }
  });

  it("Settles an order", async () => {
    try {
      const currentPrice = INITIAL_PRICE.add(new BN(5000 * 1e6)); // Price moved up 5000 USDC
      
      // Use positionOrderPda which should be correctly initialized
      // positionOrderPda is initialized in the "Matches a position order" test
      const tx = await program.methods
        .settleOrder(currentPrice)
        .accounts({
          authority: provider.wallet.publicKey,
          orderbook: orderbookPda,
          order: positionOrderPda,
          trader: trader2.publicKey,
          traderState: trader2State,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();
        
      console.log("Order settled with transaction:", tx);
    } catch (error) {
      console.error("Error settling order:", error);
    }
  });
});
