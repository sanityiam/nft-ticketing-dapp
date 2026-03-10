import { Contract } from "ethers";
import { getBrowserProvider } from "./ethereum";

import addresses from "../contracts/addresses.json";
import ticketingAbi from "../contracts/abi/TicketingPlatform.abi.json";
import nftAbi from "../contracts/abi/EventTicketNFT.abi.json";

export async function getContracts() {
  const provider = await getBrowserProvider();
  const signer = await provider.getSigner();

  const ticketingPlatform = new Contract(
    addresses.contracts.TicketingPlatform,
    ticketingAbi,
    signer
  );

  const eventTicketNFT = new Contract(
    addresses.contracts.EventTicketNFT,
    nftAbi,
    signer
  );

  return {
    provider,
    signer,
    ticketingPlatform,
    eventTicketNFT,
    addresses,
  };
}