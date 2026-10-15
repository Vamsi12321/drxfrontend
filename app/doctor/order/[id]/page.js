"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createRequest } from "@/lib/orderStore";

const FORM_ICONS = {
  Tablet: "/drx/images/icons/drug_icon.png",
  Capsule: "/drx/images/icons/drug_icon.png",
  Syrup: "/drx/images/icons/syrup_icon.png",
  Injection: "/drx/images/icons/injection_icon.png",
  Inhaler: "/drx/images/icons/inhaler_icon.png",
  Cream: "/drx/images/icons/ointment_icon.png",
  Powder: "/drx/images/icons/Powder.png",
};

const UNITS = ["Vials", "Strips", "Boxes", "Bottles", "Units", "Packs"];

export default function CreateOrderPage() {
  const { id } = useParams();
  const router = useRouter();

  const [drug, setDrug] = useState(null);
  const [quantity, setQuantity] = useState(10);
  const [unit, setUnit] = useState("Vials");
  const [address, setAddress] = useState("");
  const [prescriptionName, setPrescriptionName] = useState("");
  const [notes, setNotes] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCompanyName(localStorage.getItem("companyName") || "");
    try {
      const cached = sessionStorage.getItem("orderDrugData");
      if (cached) {
        const d = JSON.parse(cached);
        setDrug(d);
        // default delivery address from doctor profile if any
        const savedAddr = localStorage.getItem("doctorPrimaryAddress");
        if (savedAddr) setAddress(savedAddr);
      }
    } catch { /* ignore */ }
  }, []);

  const drugName = drug?.drug_name || drug?.brand_name || "Medicine";
  const brandName = drug?.brand_name || "";
  const form = drug?.dosage_form || "";
  const strength = drug?.strength || drug?.dosage_strength || "";
  const drugIcon = FORM_ICONS[form] || "/drx/images/icons/drug_icon.png";

  const handleSubmit = () => {
    setError("");
    if (!quantity || quantity < 1) { setError("Please enter a valid quantity"); return; }
    if (!address.trim()) { setError("Delivery address is required"); return; }
    setSubmitting(true);

    setTimeout(() => {
      const req = createRequest({
        drug,
        quantity,
        unit,
        address: address.trim(),
        notes: notes.trim(),
        prescriptionName: prescriptionName.trim(),
        orgName: companyName,
      });
      router.push(`/doctor/order/success/${req.id}`);
    }, 700);
  };

  if (!drug) {
    return (
      <div className="text-center py-20">
        <span className="text-4xl block mb-3">💊</span>
        <p className="text-gray-500 text-sm">No drug selected for ordering.</p>
        <button onClick={() => router.push("/doctor/drug-search")} className="mt-4 text-[#5b2bce] font-semibold text-sm">← Go to Medicines Library</button>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Top bar */}
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-[#5b2bce] font-medium">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> Back
      </button>

      <div>
        <h1 className="text-xl font-bold text-gray-900">Order {drugName}</h1>
        <p className="text-sm text-gray-500">Select quantity, delivery address, and add optional notes or prescription.</p>
      </div>

      <div className="flex gap-5 flex-col lg:flex-row">
        {/* ═══ Left — form ═══ */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Drug card */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
            <div className="w-14 h-14 bg-[#eef0f9] rounded-2xl flex items-center justify-center overflow-hidden flex-shrink-0">
              <img src={drugIcon} alt="" className="w-16 h-16 object-cover" />
            </div>
            <div>
              <p className="text-base font-bold text-gray-900 capitalize">{drugName}</p>
              <p className="text-xs text-gray-500 capitalize">{[brandName, form, strength].filter(Boolean).join(" · ")}</p>
              {companyName && <span className="inline-block mt-1 text-[10px] bg-indigo-50 text-[#5b2bce] px-2 py-0.5 rounded-full font-semibold">{companyName}</span>}
            </div>
          </div>

          {/* Quantity */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
              <span className="w-1 h-4 bg-[#5b2bce] rounded-full inline-block" /> Quantity
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-3 py-2.5 text-gray-500 hover:bg-gray-50 text-lg font-bold">−</button>
                <input type="number" value={quantity} min={1}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 text-center py-2.5 text-sm font-semibold outline-none border-x border-gray-200" />
                <button onClick={() => setQuantity((q) => q + 1)} className="px-3 py-2.5 text-gray-500 hover:bg-gray-50 text-lg font-bold">+</button>
              </div>
              <select value={unit} onChange={(e) => setUnit(e.target.value)}
                className="px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#5b2bce]/20 bg-white">
                {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span className="w-1 h-4 bg-[#5b2bce] rounded-full inline-block" /> Delivery Address <span className="text-red-500">*</span>
              </p>
            </div>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={3}
              placeholder="Enter the delivery address (hospital / clinic / home)..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#5b2bce]/20 focus:border-[#5b2bce] resize-none" />
          </div>

          {/* Supporting Documents */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm font-bold text-gray-900 mb-1 flex items-center gap-1.5">
              <span className="w-1 h-4 bg-[#5b2bce] rounded-full inline-block" /> Supporting Documents <span className="text-gray-400 text-[10px] font-normal">(Optional)</span>
            </p>
            <p className="text-[11px] text-gray-400 mb-3">Attach any clinical justification, indent note, or reference document to help the rep review your request faster.</p>
            <input value={prescriptionName} onChange={(e) => setPrescriptionName(e.target.value)}
              placeholder="e.g. Clinical-justification.pdf, Indent-note.docx"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#5b2bce]/20 focus:border-[#5b2bce] mb-2" />
            <button type="button" onClick={() => alert("File upload will be enabled soon.")}
              className="flex items-center gap-2 text-xs text-[#5b2bce] font-semibold border border-dashed border-[#5b2bce]/40 rounded-xl px-3 py-2 hover:bg-purple-50 transition-all w-full justify-center">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Upload document (coming soon)
            </button>
          </div>

          {/* Additional Notes */}
          <div className="bg-white rounded-xl border border-gray-100 p-5">
            <p className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-1.5">
              <span className="w-1 h-4 bg-[#5b2bce] rounded-full inline-block" /> Additional Notes <span className="text-gray-400 text-[10px] font-normal">(Optional)</span>
            </p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              placeholder="Any special instructions for this order..."
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#5b2bce]/20 focus:border-[#5b2bce] resize-none" />
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}

          {/* Actions (mobile) */}
          <div className="flex gap-3 lg:hidden">
            <button onClick={() => router.back()} className="flex-1 border border-gray-200 text-gray-700 py-3 rounded-xl text-sm font-semibold hover:bg-gray-50">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 bg-[#5b2bce] hover:bg-[#4318d1] text-white py-3 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </div>
        </div>

        {/* ═══ Right — order summary ═══ */}
        <div className="w-full lg:w-[300px] flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-100 p-5 sticky top-4">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Order Summary</h3>

            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-11 h-11 bg-[#eef0f9] rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0">
                <img src={drugIcon} alt="" className="w-12 h-12 object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-800 capitalize truncate">{drugName}</p>
                <p className="text-[10px] text-gray-400 capitalize">{[form, strength].filter(Boolean).join(" · ")}</p>
              </div>
            </div>

            <div className="space-y-2.5 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Quantity</span>
                <span className="text-xs font-semibold text-gray-800">{quantity} {unit}</span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs text-gray-400 flex-shrink-0">Delivery to</span>
                <span className="text-xs font-medium text-gray-700 text-right line-clamp-2">{address || "—"}</span>
              </div>
              {companyName && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Organization</span>
                  <span className="text-xs font-semibold text-[#5b2bce]">{companyName}</span>
                </div>
              )}
            </div>

            <div className="flex items-start gap-2 py-3">
              <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>
              <p className="text-[10px] text-gray-500 leading-snug">This is a request to your assigned representative. Pricing &amp; availability will be confirmed after review.</p>
            </div>

            <div className="hidden lg:flex flex-col gap-2 mt-1">
              <button onClick={handleSubmit} disabled={submitting}
                className="w-full bg-[#5b2bce] hover:bg-[#4318d1] text-white py-3 rounded-xl text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition-all">
                {submitting ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Submitting...</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Submit Request</>
                )}
              </button>
              <button onClick={() => router.back()} className="w-full border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
