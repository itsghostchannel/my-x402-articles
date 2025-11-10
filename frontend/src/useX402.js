import { useContext } from "react";
import { X402Context } from "./x402.jsx";

export const useX402 = () => {
  const context = useContext(X402Context);
  if (!context) {
    throw new Error("useX402 must be used within X402Provider");
  }
  return context;
};