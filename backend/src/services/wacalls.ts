import { callBridge, callBridgeGet, bridgeBaseUrl, bridgeSecret } from "./whatsappBridge.js";

export interface WaCallOptions {
  channelId: string;
  toJid: string;
  organizationId: string;
}

export interface WaCallStatus {
  id: string;
  channelId: string;
  toJid: string;
  state: "ringing" | "connected" | "ended" | "failed" | "missed";
  direction: "outgoing" | "incoming";
  duration?: number;
  startTime?: string;
  endTime?: string;
  error?: string;
}

export async function initiateCall(options: WaCallOptions): Promise<WaCallStatus> {
  return callBridge(`/calls/${options.channelId}/initiate`, {
    organizationId: options.organizationId,
    channelId: options.channelId,
    toJid: options.toJid,
  }) as Promise<WaCallStatus>;
}

export async function endCall(channelId: string, callId: string): Promise<void> {
  await callBridge(`/calls/${channelId}/${callId}/end`, {});
}

export async function getCallStatus(channelId: string, callId: string): Promise<WaCallStatus> {
  return callBridgeGet(`/calls/${channelId}/${callId}/status`) as Promise<WaCallStatus>;
}

export async function listActiveCalls(channelId: string): Promise<WaCallStatus[]> {
  return callBridgeGet(`/calls/${channelId}/active`) as Promise<WaCallStatus[]>;
}

export async function startCallSSE(channelId: string): Promise<string> {
  return `${bridgeBaseUrl()}/calls/${channelId}/events`;
}
