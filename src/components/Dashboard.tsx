// src/components/Dashboard.tsx
import React, { useEffect, useState } from "react";
import {
  web3Enable,
  web3Accounts,
  web3FromAddress,
} from "@polkadot/extension-dapp";
import { connectApi } from "../api";
import { Codec } from "@polkadot/types/types";

const Dashboard: React.FC = () => {
  const [account, setAccount] = useState<any>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [storedProfile, setStoredProfile] = useState<{
    username: string;
    bio: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [txStatus, setTxStatus] = useState("");

  // Load extension & account
  const loadAccount = async () => {
    await web3Enable("my-polkadot-app");
    const accounts = await web3Accounts();
    if (accounts.length > 0) {
      setAccount(accounts[0]);
    }
  };

  // Fetch profile from chain
const fetchProfile = async () => {
  setLoading(true);
  const api = await connectApi();
  const result = await api.query.template.userProfiles(account.address);

  if (!result.isEmpty) {
    const [storedUsername, storedBio] = result.toHuman() as [string, string];
    setStoredProfile({ username: storedUsername, bio: storedBio });
  } else {
    setStoredProfile(null);
  }

  setLoading(false);
};


  // Set profile
  const handleSetProfile = async () => {
    if (!username || !bio || !account) return;
    const api = await connectApi();
    const injector = await web3FromAddress(account.address);
    const tx = api.tx.template.setProfile(username, bio);

    setTxStatus("Submitting...");
    await tx.signAndSend(
      account.address,
      { signer: injector.signer },
      ({ status }) => {
        if (status.isInBlock) setTxStatus("Transaction included in block.");
        if (status.isFinalized) {
          setTxStatus("Profile successfully updated.");
          fetchProfile();
        }
      }
    );
  };

  // Remove profile
  const handleRemoveProfile = async () => {
    const api = await connectApi();
    const injector = await web3FromAddress(account.address);
    const tx = api.tx.template.removeUserInfo();

    setTxStatus("Submitting...");
    await tx.signAndSend(
      account.address,
      { signer: injector.signer },
      ({ status }) => {
        if (status.isInBlock) setTxStatus("Removing profile...");
        if (status.isFinalized) {
          setTxStatus("Profile removed.");
          setStoredProfile(null);
        }
      }
    );
  };

  useEffect(() => {
    loadAccount();
  }, []);

  useEffect(() => {
    if (account) fetchProfile();
  }, [account]);

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "40px auto",
        padding: 20,
        border: "1px solid #ddd",
        borderRadius: 10,
      }}
    >
      <h2>🌐 Decentralized Profile Manager</h2>
      <p>
        <strong>Connected:</strong> {account?.address || "Loading..."}
      </p>

      {loading ? (
        <p>Loading profile from blockchain...</p>
      ) : storedProfile ? (
        <div
          style={{ backgroundColor: "#f0f0f0", padding: 10, borderRadius: 6 }}
        >
          <p>
            <strong>Username:</strong> {storedProfile.username}
          </p>
          <p>
            <strong>Bio:</strong> {storedProfile.bio}
          </p>
          <button onClick={handleRemoveProfile}>❌ Remove Profile</button>
        </div>
      ) : (
        <p>No profile found on-chain.</p>
      )}

      <hr />

      <h4>👤 Update Your Profile</h4>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ width: "100%", marginBottom: 10 }}
      />
      <textarea
        placeholder="Bio"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        rows={3}
        style={{ width: "100%", marginBottom: 10 }}
      />
      <button onClick={handleSetProfile}>💾 Save Profile</button>

      <p style={{ marginTop: 10, color: "green" }}>{txStatus}</p>
    </div>
  );
};

export default Dashboard;
