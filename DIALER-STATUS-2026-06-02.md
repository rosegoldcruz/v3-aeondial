# AEON Dial v3 — Dialer Status Report

**Date:** 2026-06-05  
**Status:** Production-ready against local stub; awaiting SIP trunk for PSTN

---

## What's Built

### Infrastructure (Asterisk 18 on Hetzner)
- Asterisk 18.10 installed and running via systemd
- PJSIP configured with:
  - `agent01` endpoint (for softphone/webRTC registration)
  - `stub-local` endpoint (for SIP client testing)
  - Trunk placeholder (commented out, ready for provider config)
- ARI enabled on `127.0.0.1:8088` with user `aeon`
- HTTP server enabled for ARI REST + WebSocket
- `chan_sip` disabled (PJSIP only)
- Local test context `aeon-test` for origination testing without registration
- All config mirrored to `/opt/aeondial-v3/infra/asterisk/`

### Database
- `calls` table added to `database/schema.sql`
- Columns: id, org_id, user_id, lead_id, contact_id, direction, from_number, to_number, status, started_at, answered_at, ended_at, duration_s, disposition, recording_url, ari_channel_id, created_at, updated_at
- Enums: `call_direction` (outbound, inbound), `call_status` (initiated, ringing, answered, completed, failed, busy, no_answer, cancelled)
- Indexes on org_id, lead_id, contact_id, ari_channel_id
- Updated_at trigger active
- Migration ran successfully

### Telephony Library (`lib/telephony/`)
- `ari-client.ts` — Minimal ARI REST client (native `node:http`) + WebSocket event stream (`ws`)
  - originate, hangup, answer, getChannel, listChannels
  - startRecording, stopRecording
  - createBridge, addChannelToBridge
  - AriEventStream class with auto-reconnect
- `call-manager.ts` — Call lifecycle orchestrator
  - originateCall: creates DB row, fires ARI originate, correlates channel ID
  - hangupCall: ARI hangup + DB update
  - setDisposition: updates DB
  - Event handlers: StasisStart → ringing, ChannelStateChange(Up) → answered, StasisEnd → completed
  - Automatic fallback to `Local/9999@aeon-test` when no SIP trunk configured
- `index.ts` — barrel export

### API Endpoints (`/api/dialer/calls/*`)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/dialer/calls` | Originate outbound call |
| GET | `/api/dialer/calls` | List recent calls (limit param) |
| GET | `/api/dialer/calls/:id` | Get single call |
| POST | `/api/dialer/calls/:id/hangup` | Hang up active call |
| POST | `/api/dialer/calls/:id/disposition` | Set call outcome |
| GET | `/api/dialer/calls/:id/recording` | Get recording URL |

All endpoints are `force-dynamic`, gated by `getOrgId()`, return 401 if unauthorized.

### UI Wiring
- `CallButton` component on lead detail panel (appears when lead has phone number)
- `ActiveCallCard` with real-time timer, hangup button, disposition picker
- `RecentCallsList` on dialer dashboard showing live call data from DB
- Poll-based status updates while call is active (2s interval)

### Data Layer (`lib/data/dialer.ts`)
- getRecentCalls, getActiveCalls, getCallById, getCallStats, getCallsByLead, getCallsByContact
- All org-scoped

---

## What's Verified

1. **ARI connectivity**: `curl` to `http://127.0.0.1:8088/ari/asterisk/info` returns system info
2. **ARI originate**: Successfully creates channels to `Local/9999@aeon-test`
3. **Stasis events**: WebSocket receives StasisStart, ChannelStateChange, StasisEnd for originated channels
4. **DB lifecycle**: initiated → ringing → answered → completed with correct timestamps
5. **API endpoints**: All 6 endpoints tested via curl against running Next.js server
6. **Hangup**: ARI DELETE channel + DB status update (cancelled, duration computed)
7. **Disposition**: POST updates DB, returns updated call record
8. **TypeScript**: `npx tsc --noEmit` → 0 errors
9. **Build**: `npm run build` → exit 0, all routes compile
10. **No build-time DB connection**: Pool pattern preserved

---

## Gap to PSTN (What You Need to Provide)

### Required Credentials (add to `.env.local`)

```env
# Already configured (ARI):
ARI_URL=http://127.0.0.1:8088
ARI_USER=aeon
ARI_PASS=aeon_ari_secret_changeme

# NEEDED — SIP Trunk Provider:
SIP_PROVIDER_HOST=          # e.g. sip.telnyx.com or pstn.twilio.com
SIP_USERNAME=               # trunk auth username
SIP_PASSWORD=               # trunk auth password
SIP_OUTBOUND_DID=           # your outbound caller ID (e.g. +15551234567)
```

### Steps to Enable Real PSTN Calls

1. **Choose a SIP trunk provider** (Telnyx, Twilio Elastic SIP, Bandwidth, or VoIP.ms)
2. **Get credentials**: host, username, password, and at least one DID
3. **Fill `.env.local`** with the 4 SIP vars above
4. **Uncomment the trunk section** in `/etc/asterisk/pjsip.conf` (lines are marked)
   - Replace `${SIP_PROVIDER_HOST}`, `${SIP_USERNAME}`, `${SIP_PASSWORD}` with real values
   - OR: use the `infra/asterisk/pjsip.conf` template and re-copy to `/etc/asterisk/`
5. **Reload Asterisk**: `asterisk -rx "pjsip reload"`
6. **Verify trunk registration**: `asterisk -rx "pjsip show endpoints"` should show trunk as Reachable
7. **Test outbound**: `POST /api/dialer/calls` with a real phone number
8. **Configure inbound**: Point your DID to this box's IP, calls arrive in `[aeon-inbound]` context

### Optional Enhancements (not blocking)
- WebRTC agent softphone (register as `agent01` via SRTP/WSS)
- Recording storage (currently writes to local filesystem; move to S3)
- AMD (Answering Machine Detection) — disabled per AGENTS.md spec
- Campaign/progressive dialer mode (concurrency control)

---

## Runbook: Bring Dialer Online

```bash
# 1. Verify Asterisk is running
systemctl status asterisk

# 2. Verify ARI responds
curl -u aeon:aeon_ari_secret_changeme http://127.0.0.1:8088/ari/asterisk/info

# 3. Test originate (local stub — no trunk needed)
curl -X POST http://localhost:3000/api/dialer/calls \
  -H "Content-Type: application/json" \
  -d '{"toNumber":"9999"}'

# 4. After trunk is configured — test real call
curl -X POST http://localhost:3000/api/dialer/calls \
  -H "Content-Type: application/json" \
  -d '{"toNumber":"+15551234567","leadId":"<uuid>"}'

# 5. Hangup
curl -X POST http://localhost:3000/api/dialer/calls/<call-id>/hangup

# 6. Set disposition
curl -X POST http://localhost:3000/api/dialer/calls/<call-id>/disposition \
  -H "Content-Type: application/json" \
  -d '{"disposition":"connected"}'

# 7. Monitor active channels
asterisk -rx "core show channels"

# 8. Check ARI event stream (debug)
wscat -c "ws://127.0.0.1:8088/ari/events?api_key=aeon:aeon_ari_secret_changeme&app=aeon-dialer"
```

---

## File Manifest

| Path | Purpose |
|------|---------|
| `infra/asterisk/pjsip.conf` | PJSIP endpoints + trunk template |
| `infra/asterisk/extensions.conf` | Dialplan (aeon-internal, aeon-test, aeon-inbound) |
| `infra/asterisk/ari.conf` | ARI user config |
| `infra/asterisk/http.conf` | HTTP server for ARI |
| `infra/asterisk/modules.conf` | Module loading (PJSIP + ARI) |
| `database/schema.sql` | calls table + enums + indexes |
| `types/models.ts` | Call, CallDirection, CallStatus types |
| `lib/telephony/ari-client.ts` | ARI REST + WebSocket client |
| `lib/telephony/call-manager.ts` | Call lifecycle orchestration |
| `lib/telephony/index.ts` | Barrel export |
| `lib/data/dialer.ts` | SQL queries for dialer module |
| `app/api/dialer/calls/route.ts` | POST originate + GET list |
| `app/api/dialer/calls/[id]/route.ts` | GET single call |
| `app/api/dialer/calls/[id]/hangup/route.ts` | POST hangup |
| `app/api/dialer/calls/[id]/disposition/route.ts` | POST disposition |
| `app/api/dialer/calls/[id]/recording/route.ts` | GET recording |
| `components/pages/dialer-client.tsx` | CallButton, ActiveCallCard, RecentCallsList |
| `scripts/test-dialer-e2e.mjs` | E2E verification script |
