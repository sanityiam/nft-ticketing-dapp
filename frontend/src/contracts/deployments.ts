import deployment from "./addresses.json";

export type DeploymentJson = {
  chainId: number;
  network: string;
  deployedAt: string;
  deployer: string;
  contracts: Record<string, string>;
};

export const DEPLOYMENT = deployment as DeploymentJson;

export const ADDRESSES = {
  nft: DEPLOYMENT.contracts.EventTicketNFT,
  platform: DEPLOYMENT.contracts.TicketingPlatform,
} as const;