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

  return (
    <div className="min-h-screen w-full flex flex-col bg-black text-white font-sans">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg transition-opacity duration-300 ${
            toast.visible ? "opacity-100" : "opacity-0"
          } ${
            toast.type === "success"
              ? "bg-green-700 text-white"
              : toast.type === "error"
              ? "bg-red-700 text-white"
              : "bg-purple-700 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <header className="w-full bg-zinc-900 border-b border-zinc-800 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-700 p-2 rounded-full">
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
            <h1 className="text-xl font-bold">Decentralized Profile Manager</h1>
          </div>
          {account && (
            <div className="hidden md:flex items-center space-x-2 bg-zinc-800 px-3 py-1.5 rounded-full">
              <div className="bg-purple-700/20 text-purple-400 p-1 rounded-full">
                <svg
                  className="w-3 h-3"
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
              <span className="text-xs font-mono">
                {truncateAddress(account.address)}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Account & Profile Info */}
          <div className="space-y-6">
            {/* Account Section */}
            <section className="bg-zinc-900 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="font-medium">Account</h2>
                {isLoading && (
                  <div className="animate-pulse flex space-x-2 items-center">
                    <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                    <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                    <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                  </div>
                )}
              </div>
              <div className="p-5">
                {isLoading ? (
                  <div className="animate-pulse space-y-2">
                    <div className="h-4 bg-zinc-800 rounded w-3/4"></div>
                    <div className="h-4 bg-zinc-800 rounded w-1/2"></div>
                  </div>
                ) : account ? (
                  <div>
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="bg-purple-700 p-2 rounded-full">
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
                        <p className="font-medium">
                          {account.meta.name || "My Account"}
                        </p>
                        <p className="text-sm text-zinc-400 font-mono">
                          {account.address}
                        </p>
                      </div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-md p-3 text-sm">
                      <p className="text-zinc-400">
                        This account is connected to the Polkadot network and
                        can be used to store your profile information on-chain.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-900/20 border border-red-900/30 rounded-md p-4 flex items-start space-x-3">
                    <svg
                      className="w-5 h-5 text-red-500 mt-0.5"
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
                    <div>
                      <h3 className="font-medium text-red-400">
                        No Account Connected
                      </h3>
                      <p className="text-sm text-zinc-400 mt-1">
                        Please install the Polkadot extension and create an
                        account to use this application.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Profile Section */}
            <section className="bg-zinc-900 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
                <h2 className="font-medium">On-Chain Profile</h2>
                {isFetching && (
                  <div className="animate-pulse flex space-x-2 items-center">
                    <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                    <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                    <div className="h-2 w-2 bg-purple-500 rounded-full"></div>
                  </div>
                )}
              </div>
              <div className="p-5">
                {isLoading || isFetching ? (
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-zinc-800 rounded w-1/3"></div>
                    <div className="h-4 bg-zinc-800 rounded w-full"></div>
                    <div className="h-4 bg-zinc-800 rounded w-2/3"></div>
                  </div>
                ) : storedProfile ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm text-zinc-400 mb-1">Username</h3>
                      <p className="text-lg font-medium">
                        {storedProfile.username}
                      </p>
                    </div>
                    <div>
                      <h3 className="text-sm text-zinc-400 mb-1">Bio</h3>
                      <p className="text-sm bg-zinc-800/50 p-3 rounded-md">
                        {storedProfile.bio}
                      </p>
                    </div>
                    <button
                      onClick={handleRemoveProfile}
                      disabled={isRemoving}
                      className={`px-4 py-2 rounded-md text-sm flex items-center space-x-2 transition-colors ${
                        isRemoving
                          ? "bg-red-950 text-red-300 cursor-not-allowed"
                          : "bg-red-800 hover:bg-red-700 text-white"
                      }`}
                    >
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
                      <span>
                        {isRemoving ? "Removing..." : "Remove Profile"}
                      </span>
                    </button>
                  </div>
                ) : (
                  <div className="bg-zinc-800/30 border border-zinc-800 rounded-md p-4 text-center">
                    <svg
                      className="w-12 h-12 text-zinc-700 mx-auto mb-3"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <h3 className="font-medium text-zinc-400">
                      No Profile Found
                    </h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      Create your profile using the form to store it on the
                      blockchain.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column - Update Profile Form */}
          <div>
            <section className="bg-zinc-900 rounded-lg overflow-hidden h-full">
              <div className="px-5 py-4 border-b border-zinc-800">
                <h2 className="font-medium">Update Profile</h2>
              </div>
              <div className="p-5">
                <div className="space-y-5">
                  <div>
                    <label
                      htmlFor="username"
                      className="block text-sm text-zinc-400 mb-1"
                    >
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      placeholder="Enter your username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="bio"
                      className="block text-sm text-zinc-400 mb-1"
                    >
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      placeholder="Tell us about yourself"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={6}
                      className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-transparent transition-all resize-none"
                    />
                  </div>

                  <div className="bg-zinc-800/30 border border-zinc-800 rounded-md p-4 text-sm text-zinc-400">
                    <p>
                      Your profile information will be stored on the blockchain
                      and will be publicly accessible.
                    </p>
                  </div>

                  <button
                    onClick={handleSetProfile}
                    disabled={isSubmitting || !account}
                    className={`w-full py-3 rounded-md flex items-center justify-center space-x-2 font-medium transition-colors ${
                      isSubmitting || !account
                        ? "bg-purple-900/50 text-purple-300/50 cursor-not-allowed"
                        : "bg-purple-700 hover:bg-purple-600 text-white"
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <svg
                          className="animate-spin h-5 w-5 text-white"
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
                        <span>Saving to Blockchain...</span>
                      </div>
                    ) : (
                      <>
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
                            d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                          />
                        </svg>
                        <span>Save Profile to Blockchain</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-zinc-900 border-t border-zinc-800 py-4 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-sm text-zinc-500">
          <p>© {new Date().getFullYear()} Decentralized Profile Manager</p>
          <div className="flex items-center space-x-4 mt-2 md:mt-0">
            <a href="#" className="hover:text-purple-400 transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-purple-400 transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-purple-400 transition-colors">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
