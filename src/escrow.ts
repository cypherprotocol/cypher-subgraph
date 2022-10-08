import {
  AmountStopped as AmountStoppedEvent,
  TransactionDenied as TransactionDeniedEvent,
  TransactionAccepted as TransactionAcceptedEvent,
  OracleAdded as OracleAddedEvent,
  TimeLimitSet as TimeLimitSetEvent,
  AddressAddedToWhitelist as AddressAddedToWhitelistEvent,
  CypherEscrow as EscrowContract,
} from "../generated/CypherEscrow/CypherEscrow";

import { CypherRegistry as RegistryContract } from "../generated/CypherRegistry/CypherRegistry";

import {
  Account,
  Escrow,
  Protocol,
  EscrowTransaction,
} from "../generated/schema";

import { Address, crypto, ethereum } from "@graphprotocol/graph-ts";

function findOrCreate(address: string): Account {
  let account = Account.load(address);
  if (account === null) {
    account = new Account(address);
    account.save();
    return account;
  } else {
    return account;
  }
}

/// The main escrow function, this is from addLimiter() which is called in escrowETH() and escrowTokens()
export function handleAmountStopped(event: AmountStoppedEvent): void {
  // Create new escrowTx to display in UI
  let escrowTx = EscrowTransaction.load(event.address.toHexString());
  if (escrowTx == null) return;

  let tupleArray: Array<ethereum.Value> = [
    ethereum.Value.fromAddress(
      Address.fromString(event.params.origin.toHexString())
    ),
    ethereum.Value.fromAddress(
      Address.fromString(event.params.protocol.toHexString())
    ),
    ethereum.Value.fromAddress(
      Address.fromString(event.params.dst.toHexString())
    ),
    ethereum.Value.fromUnsignedBigInt(event.params.counter),
  ];

  let tuple = tupleArray as ethereum.Tuple;

  let encoded = ethereum.encode(ethereum.Value.fromTuple(tuple))!;

  // Calculate the id which is a hash of the event params
  escrowTx.id = crypto.keccak256(encoded).toHexString();

  escrowTx.escrow = event.address.toHexString();
  escrowTx.origin = findOrCreate(event.params.origin.toHexString()).id; // account type
  escrowTx.protocol = event.params.protocol.toHexString(); // protocol type
  escrowTx.dst = findOrCreate(event.params.origin.toHexString()).id; // account type
  escrowTx.token = event.params.tokenContract.toHexString();
  escrowTx.amount = event.params.amount;
  escrowTx.counter = event.params.counter;
  escrowTx.status = "PENDING";

  escrowTx.save();
}

export function handleTransactionAccepted(
  event: TransactionAcceptedEvent
): void {
  // Calculate the id which is a hash of the event params
  let id = event.params.key.toHexString();
  // Load the escrowTx with the specific key
  let escrowTx = EscrowTransaction.load(id);
  if (escrowTx == null) return;

  escrowTx.status = "ACCEPTED";

  escrowTx.save();
}

export function handleTransactionDenied(event: TransactionDeniedEvent): void {
  // Calculate the id which is a hash of the event params
  let id = event.params.key.toHexString();
  // Load the escrowTx with the specific key
  let escrowTx = EscrowTransaction.load(id);
  if (escrowTx == null) return;

  escrowTx.status = "DENIED";

  escrowTx.save();
}

export function handleOracleAdded(event: OracleAddedEvent): void {
  let escrow = Escrow.load(event.address.toHexString());
  if (escrow == null) {
    escrow = new Escrow(event.address.toHexString());
  }

  escrow.oracles = escrow.oracles.concat([event.params.oracle.toHexString()]);

  escrow.save();
}

export function handleTimeLimitSet(event: TimeLimitSetEvent): void {
  let escrow = Escrow.load(event.address.toHexString());
  if (escrow == null) return;

  escrow.timeLimit = event.params.timeLimit;

  escrow.save();
}

export function handleAddressAddedToWhitelist(
  event: AddressAddedToWhitelistEvent
): void {
  let escrow = Escrow.load(event.address.toHexString());
  if (escrow == null) return;

  escrow.whitelist = escrow.whitelist.concat([event.params.user.toHexString()]);

  escrow.save();
}
