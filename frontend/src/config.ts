import { type Config } from "@coinbase/cdp-react";

const ethereumAccountType = import.meta.env.VITE_CDP_CREATE_ETHEREUM_ACCOUNT_TYPE
  ? import.meta.env.VITE_CDP_CREATE_ETHEREUM_ACCOUNT_TYPE === "smart"
    ? "smart"
    : "eoa"
  : undefined;

const solanaAccountType = import.meta.env.VITE_CDP_CREATE_SOLANA_ACCOUNT
  ? import.meta.env.VITE_CDP_CREATE_SOLANA_ACCOUNT === "true"
  : true;

if (!ethereumAccountType && !solanaAccountType) {
  throw new Error(
    "Either VITE_CDP_CREATE_ETHEREUM_ACCOUNT_TYPE or VITE_CDP_CREATE_SOLANA_ACCOUNT must be defined",
  );
}

export const CDP_CONFIG = {
  projectId: import.meta.env.VITE_CDP_PROJECT_ID,
  ...(ethereumAccountType && {
    ethereum: {
      createOnLogin: ethereumAccountType,
    },
  }),
  ...(solanaAccountType && {
    solana: {
      createOnLogin: solanaAccountType,
    },
  }),
  appName: "X402 Frontend",
  appLogoUrl: "http://localhost:5173/logo.svg",
  authMethods: ["email", "sms", "oauth:google", "oauth:apple"],
} as Config;