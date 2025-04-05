// src/components/Dashboard.tsx
import React, { useEffect, useState } from "react";
import { connectApi } from "../api";
import {
  web3Enable,
  web3Accounts,
  web3FromAddress,
} from "@polkadot/extension-dapp";
import { Codec } from "@polkadot/types/types";

const Dashboard: React.FC = () => {
  const [storedValue, setStoredValue] = useState<String | null>(null);
  const [input, setInput] = useState("");
  const [account, setAccount] = useState<any>(null);
  async function cconnectApi() {
    const api = await connectApi();
    console.log("Available tx modules:", Object.keys(api.tx));
    console.log("Available query modules:", Object.keys(api.query));
  }
  cconnectApi();

  // Get stored value
  const fetchStorage = async () => {
    const api = await connectApi();
    const value = await api.query.template.something();
    setStoredValue((value as Codec).toString());
  };

  // Load Polkadot.js extension
  const loadAccount = async () => {
    await web3Enable("my-polkadot-frontend");
    const accounts = await web3Accounts();
    setAccount(accounts[0]);
  };

  // Set value
  const handleSubmit = async () => {
    if (!account) return;

    const api = await connectApi();
    const injector = await web3FromAddress(account.address);
    const tx = api.tx.template.doSomething(Number(input));

    await tx.signAndSend(
      account.address,
      { signer: injector.signer },
      ({ status }) => {
        if (status.isInBlock) {
          alert("Transaction in block!");
        }
        if (status.isFinalized) {
          alert("Transaction finalized!");
          fetchStorage();
        }
      }
    );
  };

  useEffect(() => {
    loadAccount();
    fetchStorage();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h2>🚀 Pallet Template Frontend</h2>
      <p>
        <strong>Connected Account:</strong> {account?.address || "Loading..."}
      </p>

      <h4>Stored Value in Chain: {storedValue ?? "Loading..."}</h4>

      <input
        type="number"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Enter number"
      />
      <button onClick={handleSubmit}>Set Value</button>
    </div>
  );
};

export default Dashboard;
