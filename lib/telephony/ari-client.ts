/**
 * AEON Dial v3 — ARI Client
 *
 * Minimal Asterisk REST Interface client using native http + WebSocket.
 * Provides REST methods for channel operations and a WebSocket event stream
 * for Stasis application events.
 *
 * NEVER instantiated at module top-level — only via getAriClient().
 */

import http from "node:http";
import { EventEmitter } from "node:events";

import type WebSocket from "ws";

// ---------- Config ----------
function getConfig() {
  const url = process.env.ARI_URL || "http://127.0.0.1:8088";
  const user = process.env.ARI_USER || "aeon";
  const pass = process.env.ARI_PASS || "aeon_ari_secret_changeme";
  return { url, user, pass };
}

// ---------- REST helpers ----------

interface AriRequestOptions {
  method: "GET" | "POST" | "DELETE";
  path: string;
  body?: Record<string, unknown>;
  query?: Record<string, string>;
}

async function ariRequest<T = unknown>(opts: AriRequestOptions): Promise<T> {
  const { url, user, pass } = getConfig();
  const base = new URL(url);
  const reqUrl = new URL(`/ari${opts.path}`, base);

  if (opts.query) {
    for (const [k, v] of Object.entries(opts.query)) {
      reqUrl.searchParams.set(k, v);
    }
  }

  const auth = Buffer.from(`${user}:${pass}`).toString("base64");
  const bodyStr = opts.body ? JSON.stringify(opts.body) : undefined;

  return new Promise((resolve, reject) => {
    const req = http.request(
      reqUrl,
      {
        method: opts.method,
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
          ...(bodyStr ? { "Content-Length": String(Buffer.byteLength(bodyStr)) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(data ? JSON.parse(data) : ({} as T));
            } catch {
              resolve(data as unknown as T);
            }
          } else {
            reject(new Error(`ARI ${opts.method} ${opts.path} → ${res.statusCode}: ${data}`));
          }
        });
      }
    );
    req.on("error", reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ---------- Public REST API ----------

export interface AriChannel {
  id: string;
  name: string;
  state: string;
  caller: { name: string; number: string };
  connected: { name: string; number: string };
  dialplan: { context: string; exten: string; priority: number };
  creationtime: string;
}

export interface AriBridge {
  id: string;
  technology: string;
  bridge_type: string;
  channels: string[];
}

/** Originate a new channel into the Stasis app */
export async function originate(params: {
  endpoint: string;        // e.g. "PJSIP/9999@stub-local" or "PJSIP/+15551234567@trunk-provider"
  callerId?: string;       // CallerID to present
  app?: string;            // Stasis app name (default: aeon-dialer)
  appArgs?: string;        // comma-separated args
  channelId?: string;      // optional pre-set channel ID
}): Promise<AriChannel> {
  const query: Record<string, string> = {
    endpoint: params.endpoint,
    app: params.app || "aeon-dialer",
  };
  if (params.callerId) query.callerId = params.callerId;
  if (params.appArgs) query.appArgs = params.appArgs;
  if (params.channelId) query.channelId = params.channelId;

  return ariRequest<AriChannel>({ method: "POST", path: "/channels", query });
}

/** Hang up a channel */
export async function hangup(channelId: string, reason?: string): Promise<void> {
  const query: Record<string, string> = {};
  if (reason) query.reason = reason;
  await ariRequest({ method: "DELETE", path: `/channels/${encodeURIComponent(channelId)}`, query });
}

/** Get channel info */
export async function getChannel(channelId: string): Promise<AriChannel> {
  return ariRequest<AriChannel>({ method: "GET", path: `/channels/${encodeURIComponent(channelId)}` });
}

/** List active channels */
export async function listChannels(): Promise<AriChannel[]> {
  return ariRequest<AriChannel[]>({ method: "GET", path: "/channels" });
}

/** Create a bridge */
export async function createBridge(type?: string): Promise<AriBridge> {
  const query: Record<string, string> = { type: type || "mixing" };
  return ariRequest<AriBridge>({ method: "POST", path: "/bridges", query });
}

/** Add channel to bridge */
export async function addChannelToBridge(bridgeId: string, channelId: string): Promise<void> {
  await ariRequest({
    method: "POST",
    path: `/bridges/${encodeURIComponent(bridgeId)}/addChannel`,
    query: { channel: channelId },
  });
}

/** Start recording on a channel */
export async function startRecording(channelId: string, name: string): Promise<unknown> {
  return ariRequest({
    method: "POST",
    path: `/channels/${encodeURIComponent(channelId)}/record`,
    query: { name, format: "wav", ifExists: "overwrite" },
  });
}

/** Stop recording */
export async function stopRecording(recordingName: string): Promise<void> {
  await ariRequest({
    method: "POST",
    path: `/recordings/live/${encodeURIComponent(recordingName)}/stop`,
  });
}

/** Answer a channel */
export async function answer(channelId: string): Promise<void> {
  await ariRequest({ method: "POST", path: `/channels/${encodeURIComponent(channelId)}/answer` });
}

// ---------- WebSocket Event Stream ----------

export interface AriEvent {
  type: string;
  timestamp: string;
  application: string;
  channel?: AriChannel;
  bridge?: AriBridge;
  cause?: number;
  cause_txt?: string;
  [key: string]: unknown;
}

export class AriEventStream extends EventEmitter {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _closed = false;

  async connect(): Promise<void> {
    const { url, user, pass } = getConfig();
    const wsUrl = url.replace(/^http/, "ws");
    const fullUrl = `${wsUrl}/ari/events?api_key=${user}:${pass}&app=aeon-dialer&subscribeAll=true`;

    // Dynamic import of ws (available via Next.js dependency tree)
    const { default: WebSocket } = await import("ws");
    this.ws = new WebSocket(fullUrl);

    this.ws.on("open", () => {
      this.emit("connected");
    });

    this.ws.on("message", (data: Buffer | string) => {
      try {
        const event: AriEvent = JSON.parse(data.toString());
        this.emit("event", event);
        this.emit(event.type, event);
      } catch {
        // skip malformed messages
      }
    });

    this.ws.on("close", () => {
      this.emit("disconnected");
      if (!this._closed) this.scheduleReconnect();
    });

    this.ws.on("error", (err: Error) => {
      this.emit("error", err);
      if (!this._closed) this.scheduleReconnect();
    });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch(() => {});
    }, 3000);
  }

  close() {
    this._closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
  }
}
