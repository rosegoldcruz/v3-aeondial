/**
 * Twilio Client SDK — token generation for browser WebRTC
 */

import jwt from "jsonwebtoken";

const TWILIO_BASE = "https://api.twilio.com/2010-04-01";

function getCredentials(): { sid: string; token: string; apiKey: string; apiSecret: string } {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET;
  if (!sid || !token || !apiKey || !apiSecret) {
    throw new Error("Missing Twilio credentials for Client SDK");
  }
  return { sid, token, apiKey, apiSecret };
}

export function generateTwilioClientToken(userId: string): string {
  const { sid, apiKey, apiSecret } = getCredentials();

  const payload = {
    jti: `${apiKey}-${Date.now()}`,
    iss: apiKey,
    sub: sid,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
    grants: {
      identity: userId,
      voice: {
        outgoing: {
          application_sid: process.env.TWILIO_TWIML_APP_SID || "",
        },
        incoming: {
          allow: true,
        },
      },
    },
  };

  return jwt.sign(payload, apiSecret, { algorithm: "HS256" });
}

export async function listTwilioDevices(): Promise<{ sid: string; friendlyName: string }[]> {
  const { sid, token } = getCredentials();
  const res = await fetch(`${TWILIO_BASE}/Accounts/${sid}/IncomingPhoneNumbers.json`, {
    headers: {
      Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
    },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return (json.incoming_phone_numbers || []).map((d: any) => ({ sid: d.sid, friendlyName: d.friendly_name }));
}
