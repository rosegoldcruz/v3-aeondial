/**
 * n8n Automation Engine — client helper for AEON Dial v3.
 *
 * Provides typed helpers to:
 * 1. Trigger n8n workflows via webhook
 * 2. List workflows via REST API
 * 3. Get workflow execution status
 *
 * All calls are server-side only. Never import this in a client component.
 */

function getBaseUrl(): string {
  const url = process.env.N8N_BASE_URL;
  if (!url) throw new Error("Missing required env var: N8N_BASE_URL");
  return url.replace(/\/$/, "");
}

function getHeaders(): HeadersInit {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  const apiKey = process.env.N8N_API_KEY;
  if (apiKey) {
    headers["X-N8N-API-KEY"] = apiKey;
  }
  return headers;
}

// ─── Webhook Trigger ───────────────────────────────────────────────────────────

export interface WebhookPayload {
  event: string;
  org_id: string;
  data: Record<string, unknown>;
  triggered_at?: string;
}

export interface WebhookResponse {
  success: boolean;
  executionId?: string;
  data?: unknown;
  error?: string;
}

/**
 * Trigger an n8n workflow via its webhook URL path.
 * The webhook path is configured in the n8n workflow editor.
 * Example: triggerWebhook("aeon/deal-won", { org_id, data: { deal_id } })
 */
export async function triggerWebhook(
  webhookPath: string,
  payload: WebhookPayload
): Promise<WebhookResponse> {
  const base = getBaseUrl();
  const url = `${base}/webhook/${webhookPath}`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        triggered_at: payload.triggered_at ?? new Date().toISOString(),
      }),
    });

    if (!res.ok) {
      return { success: false, error: `n8n responded ${res.status}` };
    }

    const data = await res.json().catch(() => ({}));
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "n8n unreachable",
    };
  }
}

// ─── REST API (requires API key) ──────────────────────────────────────────────

export interface N8nWorkflow {
  id: string;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  tags?: { id: string; name: string }[];
}

export interface N8nExecution {
  id: string;
  finished: boolean;
  mode: string;
  startedAt: string;
  stoppedAt?: string;
  workflowId: string;
  status: string;
}

/**
 * List all workflows from n8n (requires N8N_API_KEY).
 */
export async function listWorkflows(): Promise<N8nWorkflow[]> {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/api/v1/workflows`, {
      headers: getHeaders(),
      next: { revalidate: 30 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

/**
 * Get recent executions from n8n.
 */
export async function listExecutions(limit = 20): Promise<N8nExecution[]> {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/api/v1/executions?limit=${limit}`, {
      headers: getHeaders(),
      next: { revalidate: 10 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

/**
 * Activate or deactivate a workflow.
 */
export async function setWorkflowActive(
  workflowId: string,
  active: boolean
): Promise<boolean> {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/api/v1/workflows/${workflowId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ active }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Health check — verify n8n is reachable.
 */
export async function healthCheck(): Promise<boolean> {
  const base = getBaseUrl();
  try {
    const res = await fetch(`${base}/healthz`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
