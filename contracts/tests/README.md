# Bound Market Contract Tests

This directory contains tests for the Bound Market Solana smart contracts.

## Running the Tests

To run the tests, make sure you have the Solana development environment set up with Anchor.

1. Start a local Solana validator:
   ```
   solana-test-validator
   ```

2. Build the Anchor program:
   ```
   anchor build
   ```

3. Deploy the program to the local validator:
   ```
   anchor deploy
   ```

4. Run the tests:
   ```
   anchor test
   ```

## Test Overview

The tests in `contracts.ts` validate the following functionalities:

1. **Initializing an orderbook**: Creates a new orderbook for a specific asset type
2. **Updating price**: Updates the base price from an oracle
3. **Registering traders**: Registers new traders with initial funds
4. **Placing StayIn orders**: Places liquidity orders that bet on price staying within a range
5. **Placing Breakout orders**: Places liquidity orders that bet on price breaking out of a range
6. **Matching position orders**: Matches a position order with existing liquidity
7. **Cancelling orders**: Cancels an existing order and releases funds
8. **Processing expired orders**: Processes multiple expired orders in batch
9. **Settling orders**: Settles an individual order based on current price

## Troubleshooting

If you encounter errors running the tests, make sure:

1. Your local validator is running
2. The program has been built and deployed
3. The Anchor.toml file has the correct program ID
4. You have sufficient SOL in your local wallet

For more detailed error logging, modify the test file to include additional console.log statements. 