"use client";

import type React from "react";
import { useEffect, useState } from "react";
import {
  web3Enable,
  web3Accounts,
  web3FromAddress,
} from "@polkadot/extension-dapp";
import { connectApi } from "../api";

type Profile = {
  username: string;
  bio: string;
};

type Account = {
  address: string;
  meta: {
    name: string;
  };
};

type ToastType = "success" | "error" | "info";

const Dashboard: React.FC = () => {
  const [account, setAccount] = useState<Account | null>(null);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [storedProfile, setStoredProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: ToastType;
    visible: boolean;
  } | null>(null);

  // Show toast notification
  const showToast = (message: string, type: ToastType = "info") => {
    setToast({ message, type, visible: true });
    setTimeout(() => {
      setToast((prev) => (prev ? { ...prev, visible: false } : null));
    }, 3000);
  };

  // Load extension & account
  const loadAccount = async () => {
    try {
      await web3Enable("my-polkadot-app");
      const accounts = await web3Accounts();
      if (accounts.length > 0) {
        setAccount(accounts[0] as Account);
      } else {
        showToast(
          "Please install the Polkadot extension and create an account",
          "error"
        );
      }
    } catch (error) {
      console.error("Failed to load accounts:", error);
      showToast("Failed to connect to Polkadot extension", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch profile from chain
  const fetchProfile = async () => {
    if (!account) return;

    setIsFetching(true);
    try {
      const api = await connectApi();
      const result = await api.query.template.userProfiles(account.address);

      if (!result.isEmpty) {
        const [storedUsername, storedBio] = result.toHuman() as [
          string,
          string
        ];
        setStoredProfile({ username: storedUsername, bio: storedBio });

        // Pre-fill form with existing data
        setUsername(storedUsername);
        setBio(storedBio);
      } else {
        setStoredProfile(null);
      }
    } catch (error) {
      console.error("Failed to fetch profile:", error);
      showToast("Failed to fetch profile from blockchain", "error");
    } finally {
      setIsFetching(false);
    }
  };

  // Set profile
  const handleSetProfile = async () => {
    if (!username.trim() || !bio.trim() || !account) {
      showToast("Username and bio are required", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      const api = await connectApi();
      const injector = await web3FromAddress(account.address);
      const tx = api.tx.template.setProfile(username, bio);

      await tx.signAndSend(
        account.address,
        { signer: injector.signer },
        ({ status }) => {
          if (status.isInBlock) {
            showToast(
              "Your profile update has been included in a block",
              "info"
            );
          }
          if (status.isFinalized) {
            showToast("Profile successfully updated", "success");
            fetchProfile();
            setIsSubmitting(false);
          }
        }
      );
    } catch (error) {
      console.error("Failed to update profile:", error);
      showToast("Failed to update profile on blockchain", "error");
      setIsSubmitting(false);
    }
  };

  // Remove profile
  const handleRemoveProfile = async () => {
    if (!account) return;

    setIsRemoving(true);
    try {
      const api = await connectApi();
      const injector = await web3FromAddress(account.address);
      const tx = api.tx.template.removeUserInfo();

      await tx.signAndSend(
        account.address,
        { signer: injector.signer },
        ({ status }) => {
          if (status.isInBlock) {
            showToast(
              "Your profile removal has been included in a block",
              "info"
            );
          }
          if (status.isFinalized) {
            showToast("Profile successfully removed", "success");
            setStoredProfile(null);
            setUsername("");
            setBio("");
            setIsRemoving(false);
          }
        }
      );
    } catch (error) {
      console.error("Failed to remove profile:", error);
      showToast("Failed to remove profile from blockchain", "error");
      setIsRemoving(false);
    }
  };

  useEffect(() => {
    loadAccount();
  }, []);

  useEffect(() => {
    if (account) fetchProfile();
  }, [account]);

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-6)}`;
  };

  // Loading skeleton component
  const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-zinc-800 rounded ${className}`}></div>
  );

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-8 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg transition-opacity duration-300 ${
            toast.visible ? "opacity-100" : "opacity-0"
          } ${
            toast.type === "success"
              ? "bg-green-800 text-white"
              : toast.type === "error"
              ? "bg-red-800 text-white"
              : "bg-zinc-800 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="max-w-2xl mx-auto bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="bg-purple-600 p-2 rounded-full">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold">
              Decentralized Profile Manager
            </h1>
          </div>
          <p className="text-zinc-400 text-sm">
            Store your profile information securely on the blockchain
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Account Section */}
          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400 mb-2">
              Connected Account
            </h3>
            {isLoading ? (
              <Skeleton className="h-6 w-full" />
            ) : account ? (
              <div className="flex items-center gap-2">
                <div className="bg-purple-600/20 text-purple-400 p-1.5 rounded-full">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-mono">
                    {truncateAddress(account.address)}
                  </p>
                  {account.meta.name && (
                    <p className="text-xs text-zinc-500">{account.meta.name}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm">No account connected</p>
              </div>
            )}
          </div>

          {/* Profile Section */}
          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400 mb-2">
              On-Chain Profile
            </h3>
            {isLoading || isFetching ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-5 w-full" />
              </div>
            ) : storedProfile ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-zinc-500">Username</p>
                  <p className="text-sm font-medium">
                    {storedProfile.username}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500">Bio</p>
                  <p className="text-sm">{storedProfile.bio}</p>
                </div>
                <button
                  onClick={handleRemoveProfile}
                  disabled={isRemoving}
                  className={`mt-2 px-3 py-1.5 text-sm rounded-md flex items-center gap-2 ${
                    isRemoving
                      ? "bg-red-950 text-red-300 cursor-not-allowed"
                      : "bg-red-900 hover:bg-red-800 text-white"
                  }`}
                >
                  {isRemoving ? (
                    <>Removing...</>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                      Remove Profile
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-zinc-500 py-2">
                <p className="text-sm">No profile found on-chain</p>
              </div>
            )}
          </div>

          {/* Update Profile Form */}
          <div className="bg-zinc-950 rounded-lg p-4 border border-zinc-800">
            <h3 className="text-sm font-medium text-zinc-400 mb-4">
              Update Your Profile
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="username"
                  className="text-xs text-zinc-400 block"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="bio" className="text-xs text-zinc-400 block">
                  Bio
                </label>
                <textarea
                  id="bio"
                  placeholder="Tell us about yourself"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-800 p-6">
          <button
            onClick={handleSetProfile}
            disabled={isSubmitting || !account}
            className={`w-full py-2.5 rounded-md flex items-center justify-center gap-2 font-medium transition-colors ${
              isSubmitting || !account
                ? "bg-purple-900/50 text-purple-300/50 cursor-not-allowed"
                : "bg-purple-600 hover:bg-purple-700 text-white"
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving to Blockchain...
              </div>
            ) : (
              <>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                Save Profile
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
