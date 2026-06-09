/**
 * Telephony Providers — Twilio (primary) + Telnyx (fallback)
 *
 * Environment:
 *   DIAL_PROVIDER=twilio
 *   FALLBACK_DIAL_PROVIDER=telnyx
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 *   TELNYX_API_KEY, TELNYX_OUTBOUND_NUMBER
 */

const TWILIO_BASE = "https://api.twilio.com/2010-04-01";
const TELNYX_BASE = "https://api.telnyx.com/v2";

export interface OriginateParams {
  orgId: string;
  userId?: string;
  leadId?: string;
  contactId?: string;
  toNumber: string;
  fromNumber?: string;
  record?: boolean;
  callbackUrl?: string;
  leadNumber?: string;
}

export interface OriginateResult {
  provider: "twilio" | "telnyx";
  callSid: string;
  status: string;
  to: string;
  from: string;
}

// ─── Twilio ──────────────────────────────────────────────────────────────────

function twilioAuth(): { sid: string; token: string } {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error("Missing Twilio credentials");
  return { sid, token };
}

function twilioFrom(): string {
  return process.env.TWILIO_PHONE_NUMBER || "";
}

export async function twilioOriginate(params: OriginateParams): Promise<OriginateResult> {
  const { sid, token } = twilioAuth();
  const fromNum = params.fromNumber || twilioFrom();
  if (!fromNum) throw new Error("Missing Twilio from number");

  const voiceUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/voice` + (params.leadNumber ? `?leadNumber=${encodeURIComponent(params.leadNumber)}` : "");

  const url = `${TWILIO_BASE}/Accounts/${sid}/Calls.json`;
  const body = new URLSearchParams({
    To: params.toNumber,
    From: fromNum,
    Url: voiceUrl,
    StatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/status`,
    StatusCallbackEvent: "initiated ringing answered completed",
    MachineDetection: "Enable",
    AsyncAmd: "true",
    MachineDetectionTimeout: "30",
    ...(params.record ? { Record: "true", RecordingStatusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio/recording` } : {}),
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Twilio originate failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return {
    provider: "twilio",
    callSid: data.sid,
    status: data.status,
    to: data.to,
    from: data.from,
  };
}

export async function twilioHangup(callSid: string): Promise<void> {
  const { sid, token } = twilioAuth();
  const url = `${TWILIO_BASE}/Accounts/${sid}/Calls/${callSid}.json`;
  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ Status: "completed" }).toString(),
  });
}

// ─── Telnyx ──────────────────────────────────────────────────────────────────

function telnyxKey(): string {
  const key = process.env.TELNYX_API_KEY;
  if (!key) throw new Error("Missing Telnyx API key");
  return key;
}

function telnyxFrom(): string {
  return process.env.TELNYX_OUTBOUND_NUMBER || "";
}

export async function telnyxOriginate(params: OriginateParams): Promise<OriginateResult> {
  const key = telnyxKey();
  const fromNum = params.fromNumber || telnyxFrom();
  if (!fromNum) throw new Error("Missing Telnyx from number");

  const res = await fetch(`${TELNYX_BASE}/calls`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to: params.toNumber,
      from: fromNum,
      connection_id: process.env.TELNYX_CONNECTION_ID,
      webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/telnyx`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Telnyx originate failed: ${res.status} ${err}`);
  }

  const json = await res.json();
  const data = json.data;
  return {
    provider: "telnyx",
    callSid: data.call_control_id || data.id,
    status: data.call_leg_id ? "initiated" : data.state || "initiated",
    to: data.to,
    from: data.from,
  };
}

export async function telnyxHangup(callControlId: string): Promise<void> {
  const key = telnyxKey();
  await fetch(`${TELNYX_BASE}/calls/${callControlId}/actions/hangup`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
}

// ─── Unified Interface ───────────────────────────────────────────────────────

export async function originateCall(params: OriginateParams): Promise<OriginateResult> {
  const primary = process.env.DIAL_PROVIDER || "twilio";
  const fallback = process.env.FALLBACK_DIAL_PROVIDER;

  try {
    if (primary === "twilio") return await twilioOriginate(params);
    if (primary === "telnyx") return await telnyxOriginate(params);
    throw new Error(`Unknown DIAL_PROVIDER: ${primary}`);
  } catch (err) {
    if (!fallback) throw err;
    if (fallback === "twilio") return await twilioOriginate(params);
    if (fallback === "telnyx") return await telnyxOriginate(params);
    throw err;
  }
}

export async function hangupCall(provider: "twilio" | "telnyx", callSid: string): Promise<void> {
  if (provider === "twilio") return twilioHangup(callSid);
  return telnyxHangup(callSid);
}
