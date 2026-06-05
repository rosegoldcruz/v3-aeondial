/**
 * AEON Dial v3 — Call Manager
 *
 * Orchestrates call lifecycle: origination, event handling, DB persistence.
 * Implements the agent-first bridge model:
 *   1. Originate to destination → Stasis
 *   2. On StasisStart → update DB row to 'ringing'
 *   3. On answer → bridge agent + destination
 *   4. On StasisEnd → mark completed, compute duration
 */

import { query, one } from "@/lib/db/pool";
import type { Call, CallDirection, CallStatus } from "@/types/models";
import {
  originate as ariOriginate,
  hangup as ariHangup,
  answer as ariAnswer,
  startRecording,
  stopRecording,
  type AriEvent,
  AriEventStream,
} from "./ari-client";

// ---------- Singleton event stream ----------
const globalForAri = globalThis as unknown as { ariStream?: AriEventStream; ariReady?: boolean };

export function getEventStream(): AriEventStream {
  if (globalForAri.ariStream) return globalForAri.ariStream;
  const stream = new AriEventStream();
  globalForAri.ariStream = stream;
  return stream;
}

/** Initialize event listener — call once at app startup (e.g. in instrumentation or API route) */
export async function initCallEventLoop(): Promise<void> {
  if (globalForAri.ariReady) return;
  globalForAri.ariReady = true;

  const stream = getEventStream();

  stream.on("StasisStart", async (event: AriEvent) => {
    const channelId = event.channel?.id;
    if (!channelId) return;

    // Update call row to ringing
    await query(
      `UPDATE calls SET status = 'ringing', ari_channel_id = $1, updated_at = now()
       WHERE ari_channel_id = $1 AND status = 'initiated'`,
      [channelId]
    );
  });

  stream.on("ChannelStateChange", async (event: AriEvent) => {
    const channelId = event.channel?.id;
    const state = event.channel?.state;
    if (!channelId) return;

    if (state === "Up") {
      // Channel answered
      await query(
        `UPDATE calls SET status = 'answered', answered_at = now(), updated_at = now()
         WHERE ari_channel_id = $1 AND status IN ('initiated', 'ringing')`,
        [channelId]
      );
    }
  });

  stream.on("StasisEnd", async (event: AriEvent) => {
    const channelId = event.channel?.id;
    if (!channelId) return;

    // Mark call completed and compute duration
    await query(
      `UPDATE calls SET
         status = CASE WHEN status = 'initiated' THEN 'failed'::call_status
                       WHEN status = 'ringing' THEN 'no_answer'::call_status
                       ELSE 'completed'::call_status END,
         ended_at = now(),
         duration_s = EXTRACT(EPOCH FROM (now() - COALESCE(answered_at, started_at)))::int,
         updated_at = now()
       WHERE ari_channel_id = $1 AND status NOT IN ('completed','failed','cancelled')`,
      [channelId]
    );
  });

  stream.on("ChannelHangupRequest", async (event: AriEvent) => {
    // Optional: log hangup cause
    const channelId = event.channel?.id;
    if (!channelId) return;
    const cause = event.cause_txt || "normal";
    await query(
      `UPDATE calls SET disposition = COALESCE(disposition, $2), updated_at = now()
       WHERE ari_channel_id = $1 AND disposition IS NULL`,
      [channelId, cause]
    );
  });

  try {
    await stream.connect();
  } catch (err) {
    console.error("[AEON Dialer] Failed to connect ARI event stream:", err);
    globalForAri.ariReady = false;
  }
}

// ---------- Call Operations ----------

export interface OriginateParams {
  orgId: string;
  userId?: string;
  leadId?: string;
  contactId?: string;
  toNumber: string;
  fromNumber?: string;
  record?: boolean;
}

/**
 * Originate an outbound call.
 * Creates the DB row, then fires ARI originate.
 * Returns the call row.
 */
export async function originateCall(params: OriginateParams): Promise<Call> {
  const { orgId, userId, leadId, contactId, toNumber, fromNumber, record } = params;

  // Determine endpoint - if we have a real trunk configured, use it; otherwise use local stub
  const trunkConfigured = !!(process.env.SIP_PROVIDER_HOST && process.env.SIP_USERNAME);
  const endpoint = trunkConfigured
    ? `PJSIP/${toNumber}@trunk-provider`
    : `Local/9999@aeon-test`;

  const callerId = fromNumber || process.env.SIP_OUTBOUND_DID || "AEON Dial";

  // Generate a channel ID so we can correlate the DB row before Stasis events arrive
  // Note: Local channels don't support custom channelIds — let ARI assign one
  const isLocalChannel = endpoint.startsWith("Local/");
  const channelId = isLocalChannel ? undefined : `aeon-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Insert call row — for Local channels we'll update ari_channel_id after originate
  const row = await one<Call>(
    `INSERT INTO calls (org_id, user_id, lead_id, contact_id, direction, from_number, to_number, status, ari_channel_id)
     VALUES ($1, $2, $3, $4, 'outbound', $5, $6, 'initiated', $7)
     RETURNING *`,
    [orgId, userId || null, leadId || null, contactId || null, callerId, toNumber, channelId || "pending"]
  );

  if (!row) throw new Error("Failed to create call row");

  // Fire ARI originate
  try {
    const ariChannel = await ariOriginate({
      endpoint,
      callerId,
      app: "aeon-dialer",
      appArgs: `outbound,${toNumber}`,
      channelId: channelId || undefined,
    });

    // For Local channels, update the row with the actual channel ID assigned by ARI
    if (isLocalChannel && ariChannel.id) {
      await query(
        `UPDATE calls SET ari_channel_id = $2, updated_at = now() WHERE id = $1`,
        [row.id, ariChannel.id]
      );
      row.ari_channel_id = ariChannel.id;
    }
  } catch (err) {
    // Mark call failed if originate itself errors
    await query(
      `UPDATE calls SET status = 'failed', ended_at = now(), updated_at = now() WHERE id = $1`,
      [row.id]
    );
    throw err;
  }

  // Optionally start recording
  if (record && row.ari_channel_id && row.ari_channel_id !== "pending") {
    try {
      await startRecording(row.ari_channel_id, `call-${row.id}`);
      await query(
        `UPDATE calls SET recording_url = $2, updated_at = now() WHERE id = $1`,
        [row.id, `/recordings/call-${row.id}.wav`]
      );
    } catch {
      // Non-fatal: recording may fail if channel not yet up
    }
  }

  return row;
}

/** Hang up an active call */
export async function hangupCall(callId: string, orgId: string): Promise<Call | null> {
  const call = await one<Call>(
    `SELECT * FROM calls WHERE id = $1 AND org_id = $2`,
    [callId, orgId]
  );
  if (!call) return null;
  if (call.status === "completed" || call.status === "failed" || call.status === "cancelled") {
    return call; // already ended
  }

  if (call.ari_channel_id) {
    try {
      await ariHangup(call.ari_channel_id);
    } catch {
      // Channel may already be gone
    }
  }

  const updated = await one<Call>(
    `UPDATE calls SET status = 'cancelled', ended_at = now(),
       duration_s = EXTRACT(EPOCH FROM (now() - COALESCE(answered_at, started_at)))::int,
       updated_at = now()
     WHERE id = $1 RETURNING *`,
    [callId]
  );
  return updated;
}

/** Set disposition on a call */
export async function setDisposition(callId: string, orgId: string, disposition: string): Promise<Call | null> {
  return one<Call>(
    `UPDATE calls SET disposition = $3, updated_at = now()
     WHERE id = $1 AND org_id = $2 RETURNING *`,
    [callId, orgId, disposition]
  );
}

/** Get a single call */
export async function getCall(callId: string, orgId: string): Promise<Call | null> {
  return one<Call>(
    `SELECT * FROM calls WHERE id = $1 AND org_id = $2`,
    [callId, orgId]
  );
}

/** List recent calls for an org */
export async function listCalls(orgId: string, limit = 50): Promise<Call[]> {
  return query<Call>(
    `SELECT * FROM calls WHERE org_id = $1 ORDER BY started_at DESC LIMIT $2`,
    [orgId, limit]
  );
}

/** Get active calls for an org */
export async function getActiveCalls(orgId: string): Promise<Call[]> {
  return query<Call>(
    `SELECT * FROM calls WHERE org_id = $1 AND status IN ('initiated','ringing','answered') ORDER BY started_at DESC`,
    [orgId]
  );
}
