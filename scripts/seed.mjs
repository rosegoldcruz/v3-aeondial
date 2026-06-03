import { Client } from "pg";

const url = process.env.POSTGRES_URL;
if (!url) {
  console.error("Missing required env var: POSTGRES_URL");
  process.exit(1);
}

const client = new Client({ connectionString: url });
await client.connect();

async function one(text, params) {
  const result = await client.query(text, params);
  return result.rows[0] ?? null;
}

async function ensureOrg() {
  return one(
    `INSERT INTO orgs (name, slug) VALUES ('SNRG Labs','snrg')
     ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name RETURNING id`,
    []
  );
}

async function ensureUser(orgId, email, name, role) {
  return one(
    `INSERT INTO users (org_id, email, name, role, active)
     VALUES ($1,$2,$3,$4,true)
     ON CONFLICT (org_id, email) DO UPDATE SET name=EXCLUDED.name, role=EXCLUDED.role, active=true
     RETURNING id`,
    [orgId, email, name, role]
  );
}

async function insertIfMissing(table, whereSql, whereParams, insertSql, insertParams) {
  const existing = await one(`SELECT id FROM ${table} WHERE ${whereSql} LIMIT 1`, whereParams);
  if (existing) return existing;
  return one(insertSql, insertParams);
}

try {
  const org = await ensureOrg();
  const orgId = org.id;

  const users = {};
  for (const [email, name, role] of [
    ["daniel@aeondial.com", "Daniel Cruz", "owner"],
    ["mike@vulpinehomes.com", "Mike Musonda", "manager"],
    ["sarah@aeondial.com", "Sarah Chen", "manager"],
    ["james@aeondial.com", "James Wilson", "employee"],
    ["lisa@aeondial.com", "Lisa Park", "employee"],
  ]) {
    users[name] = (await ensureUser(orgId, email, name, role)).id;
  }

  const entityNames = [
    ["SNRG Labs", "SNRG Labs LLC"],
    ["Vulpine Homes", "Vulpine Homes"],
    ["CWV", "Common Wealth Ventures"],
  ];
  const entities = {};
  for (const [name, legal] of entityNames) {
    entities[name] = (await one(
      `INSERT INTO entities (org_id, name, legal_name) VALUES ($1,$2,$3)
       ON CONFLICT (org_id, name) DO UPDATE SET legal_name=EXCLUDED.legal_name RETURNING id`,
      [orgId, name, legal]
    )).id;
  }

  const contacts = [
    ["Acme Corp", "Acme Renovations", "ops@acmerenovations.com", "404-555-0101", users["Sarah Chen"]],
    ["TechStart Inc", "TechStart Inc", "facilities@techstart.example", "404-555-0102", users["Mike Musonda"]],
    ["GlobalFin", "GlobalFin", "buildouts@globalfin.example", "404-555-0103", users["Daniel Cruz"]],
    ["DataSync Solutions", "DataSync Solutions", "admin@datasync.example", "404-555-0104", users["James Wilson"]],
    ["CloudBase Ltd", "CloudBase Ltd", "projects@cloudbase.example", "404-555-0105", users["Lisa Park"]],
  ];
  const contactIds = {};
  for (const [name, company, email, phone, owner] of contacts) {
    contactIds[name] = (await insertIfMissing(
      "contacts",
      "org_id=$1 AND email=$2",
      [orgId, email],
      `INSERT INTO contacts (org_id, name, company, email, phone, tags, owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [orgId, name, company, email, phone, ["cabinetry", "commercial"], owner]
    )).id;
  }

  const leads = [
    ["Northline Kitchens", "Northline", "northline@example.com", "404-555-0110", "new", "Google Ads", "Q2 Inbound", 82, "hot", "positive", ["kitchen", "commercial"], users["Sarah Chen"], "2 weeks", "Budget concerns on timeline", "Needs install by August"],
    ["Beacon HOA", "Beacon HOA", "board@beacon.example", "404-555-0111", "contacted", "Referral", "HOA Referral Drive", 68, "warm", "neutral", ["hoa", "multi-unit"], users["Mike Musonda"], "$40-60k", "Board approval cycle", "Decision in 30 days"],
    ["Rivergate Build", "Rivergate", "pm@rivergate.example", "404-555-0112", "qualified", "Inbound", "Campaign A", 91, "hot", "positive", ["builder", "priority"], users["Daniel Cruz"], "$120k+", "Fast-track timeline", "Closing this month"],
    ["Oak & Stone", "Oak & Stone", "ops@oakstone.example", "404-555-0113", "new", "Facebook Ads", "Spring Promo", 35, "cold", "neutral", ["retail"], users["Lisa Park"], null, null, null],
    ["Crescent Medical", "Crescent Medical", "facilities@crescent.example", "404-555-0114", "qualified", "Google Ads", "Healthcare Q2", 88, "hot", "positive", ["medical", "compliance"], users["James Wilson"], "$200k", "Sterile environment specs", "RFP due Friday"],
    ["Summit Multifamily", "Summit Group", "renovations@summit.example", "404-555-0115", "contacted", "Event", "Atlanta Home Show", 55, "warm", "neutral", ["multifamily"], users["Sarah Chen"], "$80k", "Phased rollout", "Q3 start"],
    ["BluePeak Offices", "BluePeak", "office@bluepeak.example", "404-555-0116", "disqualified", "Cold Outreach", null, 12, "cold", "negative", [], users["Mike Musonda"], null, "Price too high", null],
    ["Atlas Rentals", "Atlas Rentals", "leasing@atlas.example", "404-555-0117", "new", "Referral", "Partner Network", 42, "warm", "neutral", ["rental"], users["Daniel Cruz"], "$25k", null, null],
    ["Willow Creek", "Willow Creek", "manager@willow.example", "404-555-0118", "qualified", "Inbound", "Campaign A", 76, "hot", "positive", ["property-mgmt"], users["Lisa Park"], "$55k", "Wants premium finish", "2 weeks"],
    ["Harbor Retail", "Harbor Retail", "build@harbor.example", "404-555-0119", "contacted", "Google Ads", "Campaign A", 48, "warm", "neutral", ["retail", "build-out"], users["James Wilson"], "$90k", "Fixture coordination", "60 days"],
    ["Metro Foods HQ", "Metro Foods", "facilities@metrofoods.example", "404-555-0120", "contacted", "Inbound", "Campaign B", 61, "warm", "neutral", ["food-service"], users["Sarah Chen"], "$70k", "Health code compliance", "45 days"],
    ["Lakeside Condos", "Lakeside", "board@lakeside.example", "404-555-0121", "new", "Facebook Ads", "Summer Push", 28, "cold", "neutral", ["condo"], users["Mike Musonda"], null, null, null],
  ];
  const leadIds = {};
  for (const lead of leads) {
    const row = await insertIfMissing(
      "leads",
      "org_id=$1 AND email=$2",
      [orgId, lead[2]],
      `INSERT INTO leads (
         org_id, name, company, email, phone, status, source, campaign,
         score, score_tier, sentiment, tags, owner_id, budget_range, pain_points,
         decision_timeline, last_contacted_at, notes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
         CASE WHEN $9 >= 70 THEN now() - interval '1 day'
              WHEN $9 >= 40 THEN now() - interval '4 days'
              ELSE now() - interval '12 days' END,
         $17)
       RETURNING id`,
      [
        orgId, lead[0], lead[1], lead[2], lead[3], lead[4], lead[5], lead[6],
        lead[7], lead[8], lead[9], lead[10], lead[11], lead[12], lead[13], lead[14],
        `${lead[0]} — seeded lead with score ${lead[7]}.`,
      ]
    );
    leadIds[lead[0]] = row.id;
    await client.query(
      `UPDATE leads SET
         company=$3, status=$4, source=$5, campaign=$6, score=$7, score_tier=$8,
         sentiment=$9, tags=$10, owner_id=$11, budget_range=$12, pain_points=$13,
         decision_timeline=$14, notes=$15,
         last_contacted_at=CASE WHEN $7 >= 70 THEN now() - interval '1 day'
           WHEN $7 >= 40 THEN now() - interval '4 days'
           ELSE now() - interval '12 days' END
       WHERE org_id=$1 AND email=$2`,
      [
        orgId, lead[2], lead[1], lead[4], lead[5], lead[6], lead[7], lead[8], lead[9], lead[10],
        lead[11], lead[12], lead[13], lead[14],
        `${lead[0]} — seeded lead with score ${lead[7]}.`,
      ]
    );
  }

  const leadActivities = [
    ["Northline Kitchens", "call", "Discovery call", "Confirmed scope for 42 openings.", "positive", 18, users["Sarah Chen"], 1],
    ["Rivergate Build", "email", "Proposal sent", "Sent line-item pricing and timeline.", "positive", null, users["Daniel Cruz"], 2],
    ["Rivergate Build", "meeting", "Site walk", "Walkthrough scheduled with PM.", "positive", null, users["Daniel Cruz"], 1],
    ["Beacon HOA", "call", "Follow-up", "Board reviewing options.", "neutral", 12, users["Mike Musonda"], 6],
    ["Crescent Medical", "email", "RFP questions", "Answered compliance checklist.", "positive", null, users["James Wilson"], 1],
    ["Harbor Retail", "note", "Stalled", "No response to last email.", "neutral", null, users["James Wilson"], 10],
    ["Summit Multifamily", "call", "Intro call", "Interested in phased install.", "neutral", 25, users["Sarah Chen"], 3],
  ];
  for (const [leadName, kind, subject, body, sentiment, duration, userId, daysAgo] of leadActivities) {
    const leadId = leadIds[leadName];
    if (!leadId) continue;
    await insertIfMissing(
      "lead_activities",
      "org_id=$1 AND lead_id=$2 AND subject=$3",
      [orgId, leadId, subject],
      `INSERT INTO lead_activities (org_id, lead_id, kind, subject, body, sentiment, duration_seconds, user_id, occurred_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, now() - ($9::int * interval '1 day')) RETURNING id`,
      [orgId, leadId, kind, subject, body, sentiment, duration ? duration * 60 : null, userId, daysAgo]
    );
  }

  const deals = [
    ["Acme Corp Cabinet Refresh", "Acme Corp", "lead", 12500000, "2026-06-18", users["Sarah Chen"]],
    ["TechStart Breakroom Buildout", "TechStart Inc", "qualified", 8950000, "2026-07-02", users["Mike Musonda"]],
    ["GlobalFin Office Cabinets", "GlobalFin", "proposal", 24500000, "2026-07-11", users["Daniel Cruz"]],
    ["DataSync Tenant Improvement", "DataSync Solutions", "negotiation", 6780000, "2026-06-26", users["James Wilson"]],
    ["CloudBase Multifamily Package", "CloudBase Ltd", "won", 17800000, "2026-06-01", users["Lisa Park"]],
    ["Beacon HOA Phase 2", "Acme Corp", "lost", 5200000, "2026-05-22", users["Mike Musonda"]],
  ];
  const dealIds = {};
  for (const [title, contactName, stage, value, close, owner] of deals) {
    dealIds[title] = (await insertIfMissing(
      "deals",
      "org_id=$1 AND title=$2",
      [orgId, title],
      `INSERT INTO deals (org_id, title, contact_id, stage, value_cents, owner_id, expected_close, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [orgId, title, contactIds[contactName], stage, value, owner, close, "Seeded sales pipeline record"]
    )).id;
  }

  const activities = [
    ["call", "Discovery call completed", "Acme Corp confirmed cabinet scope.", dealIds["Acme Corp Cabinet Refresh"], users["Sarah Chen"]],
    ["call", "Inbound estimate request", "Northline asked for refacing availability.", dealIds["Acme Corp Cabinet Refresh"], users["Mike Musonda"]],
    ["call", "Proposal review call", "GlobalFin requested alternate finish pricing.", dealIds["GlobalFin Office Cabinets"], users["Daniel Cruz"]],
    ["call", "Install confirmation call", "CloudBase approved punch list date.", dealIds["CloudBase Multifamily Package"], users["Lisa Park"]],
    ["call", "Lead qualification call", "Rivergate confirmed 48 cabinet openings.", dealIds["TechStart Breakroom Buildout"], users["James Wilson"]],
    ["email", "Proposal sent", "GlobalFin received line-item pricing.", dealIds["GlobalFin Office Cabinets"], users["Daniel Cruz"]],
    ["meeting", "Site walk scheduled", "TechStart walkthrough is on calendar.", dealIds["TechStart Breakroom Buildout"], users["Mike Musonda"]],
    ["note", "Budget objection", "DataSync needs alternate accessory package.", dealIds["DataSync Tenant Improvement"], users["James Wilson"]],
    ["task", "Follow-up due", "CloudBase closeout paperwork pending.", dealIds["CloudBase Multifamily Package"], users["Lisa Park"]],
  ];
  for (const [kind, subject, body, dealId, userId] of activities) {
    await insertIfMissing(
      "activities",
      "org_id=$1 AND subject=$2",
      [orgId, subject],
      `INSERT INTO activities (org_id, kind, subject, body, deal_id, user_id)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [orgId, kind, subject, body, dealId, userId]
    );
  }

  const campaigns = [
    ["June Cabinet Refresh Email", "email", "active", 1240, 418, 96],
    ["Builder Follow-up SMS", "sms", "paused", 380, 0, 42],
    ["Multifamily Dialer Sprint", "dialer", "active", 920, 0, 0],
    ["Summer Refacing Offer", "marketing", "draft", 0, 0, 0],
    ["June Reactivation Dialer", "dialer", "active", 780, 0, 0],
    ["Aged Lead Dialer", "dialer", "paused", 460, 0, 0],
    ["Commercial Cabinet Dialer", "dialer", "active", 640, 0, 0],
    ["Warranty Follow-up Dialer", "dialer", "completed", 510, 0, 0],
  ];
  for (const campaign of campaigns) {
    await insertIfMissing(
      "campaigns",
      "org_id=$1 AND name=$2",
      [orgId, campaign[0]],
      `INSERT INTO campaigns (org_id, name, type, status, sent, opens, clicks)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [orgId, ...campaign]
    );
  }

  const subs = [
    ["GitHub Copilot", 4000, "Dev", "SNRG Labs"],
    ["Vercel", 2000, "Dev", "SNRG Labs"],
    ["ChatGPT Plus", 2000, "AI", "SNRG Labs"],
    ["Claude Pro", 2000, "AI", "SNRG Labs"],
    ["Gemini Advanced", 2000, "AI", "SNRG Labs"],
    ["Canva Pro", 2000, "Media", "SNRG Labs"],
    ["CapCut Pro", 2000, "Media", "SNRG Labs"],
    ["ElevenLabs", 2000, "AI Voice", "SNRG Labs"],
    ["DO Droplet (light)", 2000, "Infra", "SNRG Labs"],
    ["DO vici-rocky", 4000, "Infra", "SNRG Labs"],
    ["Neo Email", 1000, "Ops", "Vulpine Homes"],
    ["Windsurf", 1500, "Dev", "SNRG Labs"],
  ];
  for (const [name, cents, cat, ent] of subs) {
    await insertIfMissing(
      "subscriptions",
      "org_id=$1 AND entity_id=$2 AND name=$3",
      [orgId, entities[ent], name],
      `INSERT INTO subscriptions (org_id, entity_id, name, amount_cents, category)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [orgId, entities[ent], name, cents, cat]
    );
  }

  const transactions = [
    ["Vulpine cabinet deposit", 4250000, "in", "Sales", "Vulpine Homes", "2026-06-01"],
    ["Hetzner server payment", 5900, "out", "Infra", "SNRG Labs", "2026-06-02"],
    ["Door hanger print run", 31000, "out", "Marketing", "Vulpine Homes", "2026-05-30"],
    ["CloudBase payment", 17800000, "in", "Sales", "Vulpine Homes", "2026-05-28"],
    ["Cabinet sample materials", 84000, "out", "COGS", "Vulpine Homes", "2026-05-25"],
    ["SNRG retainer receipt", 2500000, "in", "Sales", "SNRG Labs", "2026-06-03"],
    ["Meta ads spend", 48500, "out", "Marketing", "SNRG Labs", "2026-06-02"],
    ["AWS workspace invoice", 17300, "out", "Infra", "SNRG Labs", "2026-05-31"],
    ["Design contract payment", 1500000, "in", "Services", "SNRG Labs", "2026-05-29"],
    ["Vulpine showroom lease", 620000, "out", "Ops", "Vulpine Homes", "2026-06-01"],
    ["Installer payroll batch", 224500, "out", "Payroll", "Vulpine Homes", "2026-05-27"],
    ["Cabinet hardware invoice", 118000, "out", "COGS", "Vulpine Homes", "2026-05-26"],
    ["Client milestone payment", 3100000, "in", "Sales", "Vulpine Homes", "2026-05-24"],
    ["SEO campaign invoice", 92000, "out", "Marketing", "SNRG Labs", "2026-05-23"],
    ["Office software renewal", 27600, "out", "Ops", "SNRG Labs", "2026-05-22"],
  ];
  for (const [desc, cents, type, cat, ent, date] of transactions) {
    await insertIfMissing(
      "transactions",
      "org_id=$1 AND entity_id=$2 AND description=$3",
      [orgId, entities[ent], desc],
      `INSERT INTO transactions (org_id, entity_id, description, amount_cents, type, category, occurred_on)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [orgId, entities[ent], desc, cents, type, cat, date]
    );
  }

  const tasks = [
    ["Call Rivergate decision maker", users["Sarah Chen"], "2026-06-05", "open", "high"],
    ["Prepare GlobalFin revised bid", users["Daniel Cruz"], "2026-06-07", "in_progress", "urgent"],
    ["Review DNC upload", users["Mike Musonda"], "2026-06-04", "open", "medium"],
    ["Publish refacing SOP update", users["Lisa Park"], "2026-06-10", "done", "low"],
    ["Approve cabinet sample invoice", users["James Wilson"], "2026-06-06", "open", "medium"],
  ];
  for (const task of tasks) {
    await insertIfMissing(
      "tasks",
      "org_id=$1 AND title=$2",
      [orgId, task[0]],
      `INSERT INTO tasks (org_id, title, assignee_id, due_date, status, priority)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [orgId, ...task]
    );
  }

  const employees = [
    ["Daniel Cruz", "Owner / Architect", "daniel@aeondial.com", "404-555-0201", "active", users["Daniel Cruz"]],
    ["Mike Musonda", "Cabinet Lead", "mike@vulpinehomes.com", "404-555-0202", "active", users["Mike Musonda"]],
    ["Alicia Reed", "Install Coordinator", "alicia@vulpinehomes.com", "404-555-0203", "active", null],
    ["Marcus Bell", "Field Technician", "marcus@vulpinehomes.com", "404-555-0204", "active", null],
    ["Priya Shah", "Ops Analyst", "priya@vulpinehomes.com", "404-555-0205", "active", null],
  ];
  const employeeIds = {};
  for (const employee of employees) {
    employeeIds[employee[0]] = (await insertIfMissing(
      "employees",
      "org_id=$1 AND email=$2",
      [orgId, employee[2]],
      `INSERT INTO employees (org_id, name, role, email, phone, status, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [orgId, ...employee]
    )).id;
  }

  const workOrders = [
    ["CloudBase punch list", users["Mike Musonda"], "in_progress", "2026-06-08", "Adjust two frameless drawer fronts."],
    ["Acme site measurement", users["Sarah Chen"], "pending", "2026-06-06", "Confirm wall cabinet run lengths."],
    ["TechStart hardware install", users["James Wilson"], "pending", "2026-06-12", "Stage pulls and soft-close hinges."],
    ["GlobalFin sample delivery", users["Daniel Cruz"], "pending", "2026-06-09", "Deliver two door samples and finish sheet."],
    ["Rivergate field verification", users["Mike Musonda"], "in_progress", "2026-06-11", "Verify pantry cabinet clearances."],
  ];
  for (const order of workOrders) {
    await insertIfMissing(
      "work_orders",
      "org_id=$1 AND title=$2",
      [orgId, order[0]],
      `INSERT INTO work_orders (org_id, title, assignee_id, status, due_date, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [orgId, ...order]
    );
  }

  const timesheets = [
    ["Mike Musonda", "2026-06-01", 6.5, "CB-INSTALL", "approved"],
    ["Alicia Reed", "2026-06-01", 4.0, "AC-MEASURE", "approved"],
    ["Marcus Bell", "2026-06-02", 7.25, "SHOP-PREP", "pending"],
    ["Mike Musonda", "2026-06-02", 5.75, "GF-SCOPE", "pending"],
    ["Alicia Reed", "2026-06-03", 3.5, "OPS-SCHED", "rejected"],
  ];
  for (const [name, date, hours, code, status] of timesheets) {
    await insertIfMissing(
      "timesheets",
      "org_id=$1 AND employee_id=$2 AND date=$3 AND job_code=$4",
      [orgId, employeeIds[name], date, code],
      `INSERT INTO timesheets (org_id, employee_id, date, hours, job_code, status)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [orgId, employeeIds[name], date, hours, code, status]
    );
  }

  const sops = [
    ["New Lead Intake", "Sales", "1.1", "## Intake\nCapture source, project type, budget, decision maker, and next action before assigning an owner."],
    ["Cabinet Install Checklist", "Field", "1.0", "## Install\nVerify measurements, protect floors, stage hardware, level boxes, document punch items."],
    ["Cabinet Refacing Process", "Field", "1.0", "## Refacing\nRemove doors, prep surfaces, apply veneer, install fronts, adjust gaps, collect signoff."],
    ["DNC Scrub Procedure", "Compliance", "1.0", "## Scrub\nNormalize numbers, check org DNC records, flag TCPA risk, export scrubbed list."],
    ["Bid Review", "Finance", "1.2", "## Review\nConfirm list totals, Mike-Logic factor, margin, exclusions, and expected close date."],
    ["Employee Onboarding", "Ops", "1.0", "## Onboarding\nCreate user, assign role, review safety practices, confirm contact details."],
    ["Marketing Asset QA", "Marketing", "1.0", "## QA\nCheck offer, phone number, logo, disclaimers, and CTA before export."],
    ["Incident Audit", "Admin", "1.0", "## Audit\nRecord user, resource, action, IP, timestamp, and resolution owner."],
  ];
  for (const sop of sops) {
    await insertIfMissing(
      "sops",
      "org_id=$1 AND title=$2",
      [orgId, sop[0]],
      `INSERT INTO sops (org_id, title, category, version, content)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [orgId, ...sop]
    );
  }

  const cabinetSkus = [
    ["B09", "Base Cabinet 9 in", "framed", false, 18200, 8],
    ["B12", "Base Cabinet 12 in", "framed", false, 21400, 12],
    ["B15", "Base Cabinet 15 in", "framed", false, 24800, 10],
    ["B18", "Base Cabinet 18 in", "framed", false, 28600, 14],
    ["B24", "Base Cabinet 24 in", "framed", false, 35200, 9],
    ["B30", "Base Cabinet 30 in", "framed", false, 42900, 7],
    ["B36", "Base Cabinet 36 in", "framed", false, 51800, 6],
    ["SB36", "Sink Base 36 in", "framed", false, 48200, 5],
    ["DB18", "Drawer Base 18 in", "framed", false, 39200, 8],
    ["DB24", "Drawer Base 24 in", "framed", false, 47600, 7],
    ["W1230", "Wall Cabinet 12x30", "frameless", false, 19800, 15],
    ["W1530", "Wall Cabinet 15x30", "frameless", false, 22600, 14],
    ["W1830", "Wall Cabinet 18x30", "frameless", false, 25400, 12],
    ["W2430", "Wall Cabinet 24x30", "frameless", false, 33200, 9],
    ["W3030", "Wall Cabinet 30x30", "frameless", false, 41800, 6],
    ["W3630", "Wall Cabinet 36x30", "frameless", false, 49200, 5],
    ["PAN2484", "Pantry Cabinet 24x84", "frameless", false, 78200, 4],
    ["TK8", "Toe Kick 8 ft", "framed", true, 4200, 24],
    ["FILL3", "Filler 3 in", "framed", true, 2800, 18],
    ["CROWN8", "Crown Molding 8 ft", "frameless", true, 6400, 16],
  ];
  for (const [sku, desc, line, accessory, listCents, qty] of cabinetSkus) {
    await insertIfMissing(
      "catalog_items",
      "org_id=$1 AND sku=$2",
      [orgId, sku],
      `INSERT INTO catalog_items (org_id, sku, description, line, is_accessory, list_cents)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [orgId, sku, desc, line, accessory, listCents]
    );
    await insertIfMissing(
      "inventory_items",
      "org_id=$1 AND sku=$2",
      [orgId, sku],
      `INSERT INTO inventory_items (org_id, name, sku, category, qty, cost_cents, list_cents)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [orgId, desc, sku, accessory ? "Accessory" : line === "framed" ? "Framed Cabinet" : "Frameless Cabinet", qty, Math.round(listCents * 0.58), listCents]
    );
  }

  const seededBids = [
    ["Acme Corp Starter Bid", "Acme Corp", "framed", "sent", 1250000, 1630000, users["Mike Musonda"]],
    ["GlobalFin Executive Suite", "GlobalFin", "frameless", "draft", 1840000, 2410000, users["Daniel Cruz"]],
    ["TechStart Breakroom Package", "TechStart Inc", "framed", "sent", 980000, 1278000, users["Sarah Chen"]],
    ["CloudBase Phase 2", "CloudBase Ltd", "frameless", "accepted", 2120000, 2765000, users["Lisa Park"]],
    ["DataSync Value Option", "DataSync Solutions", "framed", "draft", 740000, 965000, users["James Wilson"]],
  ];
  let bid = null;
  for (const [title, contactName, line, status, listTotal, bidTotal, owner] of seededBids) {
    const createdBid = await insertIfMissing(
      "bids",
      "org_id=$1 AND title=$2",
      [orgId, title],
      `INSERT INTO bids (org_id, title, contact_id, line, price_margin, status, list_total_cents, bid_total_cents, owner_id)
       VALUES ($1,$2,$3,$4,0.23,$5,$6,$7,$8) RETURNING id`,
      [orgId, title, contactIds[contactName], line, status, listTotal, bidTotal, owner]
    );
    if (title === "Acme Corp Starter Bid") bid = createdBid;
  }
  const catalogB24 = await one("SELECT id, description, list_cents FROM catalog_items WHERE org_id=$1 AND sku='B24'", [orgId]);
  if (catalogB24 && bid) {
    await insertIfMissing(
      "bid_lines",
      "bid_id=$1 AND catalog_item_id=$2",
      [bid.id, catalogB24.id],
      `INSERT INTO bid_lines (bid_id, catalog_item_id, description, qty, list_cents, factor, bid_cents)
       VALUES ($1,$2,$3,4,$4,1.304,183700) RETURNING id`,
      [bid.id, catalogB24.id, catalogB24.description, catalogB24.list_cents]
    );
  }

  const dnc = [
    ["404-555-0199", "Customer opt-out"],
    ["470-555-0120", "TCPA complaint"],
    ["678-555-0188", "Manual suppression"],
    ["770-555-0155", "Email unsubscribe matched phone"],
    ["404-555-0166", "Do not contact request"],
  ];
  for (const [phone, reason] of dnc) {
    await one(
      `INSERT INTO dnc_numbers (org_id, phone, reason)
       VALUES ($1,$2,$3)
       ON CONFLICT (org_id, phone) DO UPDATE SET reason=EXCLUDED.reason
       RETURNING id`,
      [orgId, phone, reason]
    );
  }

  const docs = [
    ["drive:install-checklist", "Cabinet Install Checklist", "indexed", "2026-06-01T14:00:00Z"],
    ["drive:pricing-policy", "Mike-Logic Pricing Policy", "indexed", "2026-06-01T15:00:00Z"],
    ["upload:dnc-procedure", "DNC Scrub Procedure", "indexed", "2026-06-02T11:00:00Z"],
    ["upload:asset-qa", "Marketing Asset QA", "pending", null],
    ["drive:field-safety", "Field Safety Checklist", "indexed", "2026-06-02T16:00:00Z"],
  ];
  for (const [source, title, status, ingested] of docs) {
    await insertIfMissing(
      "rag_documents",
      "org_id=$1 AND source=$2",
      [orgId, source],
      `INSERT INTO rag_documents (org_id, source, title, status, ingested_at)
       VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [orgId, source, title, status, ingested]
    );
  }

  const ragQueries = [
    ["What is the current open pipeline?", "Open pipeline is calculated from non-won and non-lost CRM deals."],
    ["Which SOP covers DNC scrubbing?", "Use the DNC Scrub Procedure in the Compliance SOP category."],
    ["What cabinet items are low stock?", "Low-stock inventory is a SKU with quantity under 6."],
    ["Which campaigns are active?", "Active campaigns include email, dialer, and marketing records with active status."],
    ["Who owns the GlobalFin deal?", "GlobalFin Office Cabinets is owned by Daniel Cruz in the seeded pipeline."],
  ];
  for (const [question, answer] of ragQueries) {
    await insertIfMissing(
      "rag_queries",
      "org_id=$1 AND question=$2",
      [orgId, question],
      `INSERT INTO rag_queries (org_id, user_id, question, answer, sources)
       VALUES ($1,$2,$3,$4,$5::jsonb) RETURNING id`,
      [orgId, users["Daniel Cruz"], question, answer, JSON.stringify([{ title: "Seeded knowledge base" }])]
    );
  }

  const agentRuns = [
    ["code", "Generate a Next.js route health check", "export const dynamic = \"force-dynamic\";\nexport async function GET() { return Response.json({ status: \"healthy\" }); }"],
    ["marketing", "Write a refacing SMS offer", "Refresh cabinets without a full tear-out. Reply YES for a same-week estimate."],
    ["asset", "Door hanger creative brief", "Format: 4x9 door hanger. Offer: cabinet refacing estimate. CTA: call Vulpine Homes."],
    ["code", "Create a typed pg query helper", "Use a lazy Pool and typed row interfaces for each query call."],
    ["marketing", "Draft a cabinet email subject line", "Subject: Modern cabinet upgrades without a full remodel"],
  ];
  for (const [kind, prompt, output] of agentRuns) {
    await insertIfMissing(
      "agent_runs",
      "org_id=$1 AND kind=$2 AND prompt=$3",
      [orgId, kind, prompt],
      `INSERT INTO agent_runs (org_id, user_id, kind, prompt, output, status)
       VALUES ($1,$2,$3,$4,$5,'done') RETURNING id`,
      [orgId, users["Daniel Cruz"], kind, prompt, output]
    );
  }

  const audits = [
    ["create", "deal", dealIds["Acme Corp Cabinet Refresh"], "203.0.113.10"],
    ["update", "subscription", "GitHub Copilot", "203.0.113.11"],
    ["scrub", "dnc_numbers", "404-555-0199", "203.0.113.12"],
    ["export", "report", "finance-monthly", "203.0.113.13"],
    ["login", "user", users["Daniel Cruz"], "203.0.113.14"],
  ];
  for (const [action, resource, resourceId, ip] of audits) {
    await insertIfMissing(
      "audit_log",
      "org_id=$1 AND action=$2 AND resource=$3 AND resource_id=$4",
      [orgId, action, resource, String(resourceId)],
      `INSERT INTO audit_log (org_id, user_id, action, resource, resource_id, ip)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      [orgId, users["Daniel Cruz"], action, resource, String(resourceId), ip]
    );
  }

  console.log(`✓ seeded org=${orgId}`);
  console.log("  visible data: users=5 contacts=5 leads=10 deals=6 campaigns=8 tasks=5 work_orders=5 employees=5 sops=8 inventory=20 dnc=5");
  console.log(`  Set AEON_DEV_ORG_ID=${orgId} to run before ZITADEL wiring.`);
} catch (e) {
  console.error("seed failed:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
