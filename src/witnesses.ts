import { Ledger } from "../contracts/managed/allowlist/contract/index.js";
import { WitnessContext } from "@midnight-ntwrk/compact-runtime";

export type AllowlistPrivateState = {
  readonly secretKey: Uint8Array;
  readonly merkleProof: Uint8Array[];
  readonly merkleDirections: boolean[];
};

export const createAllowlistPrivateState = (secretKey: Uint8Array, merkleProof: Uint8Array[], merkleDirections: boolean[]) => ({
  secretKey,
  merkleProof,
  merkleDirections
});

export const witnesses = {
  localSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, AllowlistPrivateState>): [
    AllowlistPrivateState,
    Uint8Array,
  ] => [privateState, privateState.secretKey],

  merkleProof: ({
    privateState,
  }: WitnessContext<Ledger, AllowlistPrivateState>): [
    AllowlistPrivateState,
    Uint8Array[],
  ] => [privateState, privateState.merkleProof],

  merkleDirections: ({
    privateState,
  }: WitnessContext<Ledger, AllowlistPrivateState>): [
    AllowlistPrivateState,
    boolean[],
  ] => [privateState, privateState.merkleDirections],
};
