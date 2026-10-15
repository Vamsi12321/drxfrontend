"use client";
// ── Faked drug order/request store (localStorage) ──
// Wire to real API later. All data is client-side for now.

const KEY = "drx_medicine_requests";

function read() {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(list) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
  // notify listeners in same tab
  window.dispatchEvent(new Event("drx-requests-updated"));
}

export function getRequests() {
  return read().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export function getRequest(id) {
  return read().find((r) => r.id === id) || null;
}

// Generate a readable request id like REQ-10291
function genId() {
  return "REQ-" + Math.floor(10000 + Math.random() * 89999);
}

/**
 * Create a new faked request.
 * payload: { drug, quantity, unit, address, notes, prescriptionName, orgName }
 */
export function createRequest(payload) {
  const list = read();
  const now = new Date().toISOString();
  const req = {
    id: genId(),
    drug_name: payload.drug?.drug_name || payload.drug?.brand_name || "Medicine",
    drug_form: payload.drug?.dosage_form || "",
    drug_strength: payload.drug?.strength || payload.drug?.dosage_strength || "",
    drug_id: payload.drug?.id || payload.drug?._id || "",
    quantity: payload.quantity || 1,
    unit: payload.unit || "Vials",
    address: payload.address || "",
    notes: payload.notes || "",
    prescription_name: payload.prescriptionName || "",
    org_name: payload.orgName || "",
    status: "PENDING", // PENDING -> APPROVED / REJECTED -> SHIPPED -> DELIVERED
    created_at: now,
    timeline: [
      { label: "Request Submitted", at: now, done: true },
      { label: "Under Review", at: null, done: false },
      { label: "Approved", at: null, done: false },
      { label: "Shipped", at: null, done: false },
      { label: "Delivered", at: null, done: false },
    ],
    tracking: null,
  };
  write([req, ...list]);
  return req;
}

// Advance a request's status (used to fake progression / demo buttons)
export function advanceStatus(id, status) {
  const list = read();
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return null;
  const now = new Date().toISOString();
  const r = list[idx];
  r.status = status;

  const markDone = (label) => {
    const t = r.timeline.find((x) => x.label === label);
    if (t) { t.done = true; if (!t.at) t.at = now; }
  };

  if (status === "APPROVED") { markDone("Under Review"); markDone("Approved"); }
  if (status === "REJECTED") {
    const t = r.timeline.find((x) => x.label === "Under Review");
    if (t) { t.done = true; if (!t.at) t.at = now; }
    r.rejected_reason = "Not available for your organization at this time.";
  }
  if (status === "SHIPPED") {
    markDone("Under Review"); markDone("Approved"); markDone("Shipped");
    r.tracking = {
      tracking_id: "TRK-" + Math.floor(100000 + Math.random() * 899999),
      courier: "MedEx Logistics",
      current_location: "Hyderabad Hub",
      eta: "2-3 business days",
      steps: [
        { label: "Order Confirmed", done: true },
        { label: "Package Ready", done: true },
        { label: "Picked Up", done: true },
        { label: "In Transit", done: true },
        { label: "Out for Delivery", done: false },
        { label: "Delivered", done: false },
      ],
    };
  }
  if (status === "DELIVERED") {
    r.timeline.forEach((t) => { t.done = true; if (!t.at) t.at = now; });
    if (r.tracking) r.tracking.steps.forEach((s) => (s.done = true));
  }

  list[idx] = r;
  write(list);
  return r;
}

export function statusMeta(status) {
  switch (status) {
    case "PENDING":  return { label: "Pending",  cls: "bg-yellow-50 text-yellow-600 border-yellow-200" };
    case "APPROVED": return { label: "Approved", cls: "bg-green-50 text-green-600 border-green-200" };
    case "REJECTED": return { label: "Rejected", cls: "bg-red-50 text-red-500 border-red-200" };
    case "SHIPPED":  return { label: "Shipped",  cls: "bg-blue-50 text-blue-600 border-blue-200" };
    case "DELIVERED":return { label: "Delivered",cls: "bg-emerald-50 text-emerald-600 border-emerald-200" };
    default:         return { label: status,     cls: "bg-gray-50 text-gray-500 border-gray-200" };
  }
}
