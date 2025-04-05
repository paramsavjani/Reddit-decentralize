// src/api.ts
import { ApiPromise, WsProvider } from "@polkadot/api";

export async function connectApi() {
  const wsProvider = new WsProvider("ws://127.0.0.1:9944");
  const api = await ApiPromise.create({ provider: wsProvider });
  await api.isReady;
  return api;
}
