"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { get } from "@/lib/api";
import { HiOutlineSearch, HiOutlineX, HiOutlineChevronDown, HiOutlineFilter } from "react-icons/hi";
import { MdOutlineList, MdOutlineGridView } from "react-icons/md";

const getVal = (drug, key) => { const v = drug?.field_values?.find((f) => f.key === key)?.value; if (Array.isArray(v)) return v.join(", "); return v || ""; };

export default function DoctorDrugSearch() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [sortBy, setSortBy] = useState("relevance");
  const [selectedDrug, setSelectedDrug] = useState(null);

  const orgId = typeof window !== "undefined" ? localStorage.getItem("selectedOrgId") : null;

  const { data, isLoading, error: fetchError } = useQuery({
    queryKey: ["drugs-public", orgId, search],
    queryFn: () => {
      if (!orgId) return [];
      const params = search.trim() ? `?search=${encodeURIComponent(search.trim())}&limit=200` : "?limit=200";
      return get(`/api/v1/organizations/${orgId}/drugs${params}`).then((d) => d.drugs || []);
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!orgId,
    retry: false,
  });

  const drugs = data || [];

  const filtered = drugs.filter((drug) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const drugName = (drug.drug_name || getVal(drug, "drug_name") || "").toLowerCase();
    const brandName = (drug.brand_name || getVal(drug, "brand_name") || "").toLowerCase();
    const allText = drug.field_values?.map((fv) => Array.isArray(fv.value) ? fv.value.join(" ") : (fv.value || "")).join(" ").toLowerCase() || "";
    return drugName.includes(q) || brandName.includes(q) || allText.includes(q);
  });

  // Navigate to drug details page
  if (typeof window !== "undefined") {
    window.__setSelectedDrug = (drug) => {
      sessionStorage.setItem("selectedDrugData", JSON.stringify(drug));
      router.push(`/doctor/drug-details/${drug.id || drug._id || drug.drug_id || encodeURIComponent(drug.drug_name)}`);
    };
  }

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Drug Search</h1>
        <p className="text-sm text-gray-500">Search for medicines, indications, dosage, and more</p>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for medicines, indications, dosage..."
            className="w-full pl-12 pr-10 py-3.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all bg-white"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <HiOutlineX className="w-4 h-4" />
            </button>
          )}
        </div>
        <button className="bg-[#5b2bce] hover:bg-[#4318d1] text-white p-3.5 rounded-xl transition-colors shadow-sm">
          <HiOutlineSearch className="w-5 h-5" />
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        {["All Types", "All Forms", "All Strengths", "All Brands", "More Filters"].map((label) => (
          <button key={label} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-full text-xs font-medium text-gray-700 bg-white hover:border-gray-300 transition-colors">
            {label}
            <HiOutlineChevronDown className="w-3 h-3 text-gray-400" />
          </button>
        ))}
        <button className="text-xs text-[#5b2bce] font-semibold hover:underline ml-1">Clear All</button>
      </div>

      {/* Results + Sidebar Layout */}
      <div className="flex gap-5">
        {/* Main Results */}
        <div className="flex-1 min-w-0">
          {/* Results bar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              Found <span className="font-bold text-[#5b2bce]">{filtered.length}</span> results{search && <> for "<span className="font-semibold text-gray-700">{search}</span>"</>}
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>Sort by:</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-medium bg-white outline-none">
                  <option value="relevance">Relevance</option>
                  <option value="name">Name</option>
                  <option value="rating">Rating</option>
                </select>
              </div>
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-white shadow-sm text-[#5b2bce]" : "text-gray-400"}`}>
                  <MdOutlineList className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-white shadow-sm text-[#5b2bce]" : "text-gray-400"}`}>
                  <MdOutlineGridView className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="space-y-3">
              {[1,2,3,4].map((i) => <div key={i} className="h-24 bg-white rounded-xl animate-pulse border border-gray-100" />)}
            </div>
          )}

          {/* Empty */}
          {!isLoading && filtered.length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <span className="text-4xl block mb-3">💊</span>
              <p className="text-gray-500 text-sm">No drugs found. Try a different search term.</p>
            </div>
          )}

          {/* List View */}
          {!isLoading && filtered.length > 0 && viewMode === "list" && (
            <div className="flex flex-col gap-6">
              {filtered.map((drug, idx) => <DrugRow key={drug._id || drug.id || drug.drug_id || idx} drug={drug} />)}
            </div>
          )}

          {/* Grid View */}
          {!isLoading && filtered.length > 0 && viewMode === "grid" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filtered.map((drug, idx) => <DrugCard key={drug._id || drug.id || drug.drug_id || idx} drug={drug} />)}
            </div>
          )}
        </div>

        {/* Right Sidebar — Refine Results */}
        <aside className="w-[200px] flex-shrink-0 hidden lg:block">
          <div className="bg-white rounded-xl border border-gray-100 p-4 sticky top-4">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Refine Results</h3>

            {/* Drug Type */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 mb-2">Drug Type</p>
              <div className="space-y-1.5">
                {["All Types", "Prescription (Rx)", "OTC", "Herbal", "Vaccine"].map((type, idx) => (
                  <label key={type} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" defaultChecked={idx === 0} className="w-3.5 h-3.5 rounded border-gray-300 text-[#5b2bce] focus:ring-[#5b2bce]" />
                    {type}
                  </label>
                ))}
              </div>
            </div>

            {/* Form */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 mb-2">Form</p>
              <div className="space-y-1.5">
                {["All Forms", "Tablet", "Capsule", "Syrup", "Injection", "Ointment"].map((form, idx) => (
                  <label key={form} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="checkbox" defaultChecked={idx === 0} className="w-3.5 h-3.5 rounded border-gray-300 text-[#5b2bce] focus:ring-[#5b2bce]" />
                    {form}
                  </label>
                ))}
              </div>
            </div>

            {/* Strength */}
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-700 mb-2">Strength</p>
              <select className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none">
                <option>Select Strength</option>
              </select>
            </div>

            {/* Buttons */}
            <button className="w-full bg-[#5b2bce] hover:bg-[#4318d1] text-white py-2 rounded-lg text-xs font-bold transition-colors mb-2">
              Apply Filters
            </button>
            <button className="w-full text-xs text-gray-500 hover:text-gray-700 font-medium">
              Reset Filters
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Drug Form Icon mapping to actual PNG images ──────────────────────────────
const FORM_ICON_MAP = {
  "Tablet": { img: "/images/icons/drug_icon.png", bg: "bg-blue-50" },
  "Capsule": { img: "/images/icons/drug_icon.png", bg: "bg-indigo-50" },
  "Syrup": { img: "/images/icons/syrup_icon.png", bg: "bg-green-50" },
  "Injection": { img: "/images/icons/injection_icon.png", bg: "bg-purple-50" },
  "Cream": { img: "/images/icons/ointment_icon.png", bg: "bg-yellow-50" },
  "Ointment": { img: "/images/icons/ointment_icon.png", bg: "bg-yellow-50" },
  "Drops": { img: "/images/icons/syrup_icon.png", bg: "bg-violet-50" },
  "Powder": { img: "/images/icons/Powder.png", bg: "bg-amber-50" },
  "Inhaler": { img: "/images/icons/inhaler_icon.png", bg: "bg-sky-50" },
};

const getDrugIcon = (form) => {
  const f = (form || "").trim();
  // Exact match first
  if (FORM_ICON_MAP[f]) return FORM_ICON_MAP[f];
  // Partial match
  const lower = f.toLowerCase();
  if (lower.includes("tablet")) return FORM_ICON_MAP["Tablet"];
  if (lower.includes("capsule")) return FORM_ICON_MAP["Capsule"];
  if (lower.includes("syrup") || lower.includes("liquid") || lower.includes("suspension")) return FORM_ICON_MAP["Syrup"];
  if (lower.includes("inject") || lower.includes("iv") || lower.includes("infusion") || lower.includes("vial")) return FORM_ICON_MAP["Injection"];
  if (lower.includes("cream") || lower.includes("ointment") || lower.includes("gel")) return FORM_ICON_MAP["Cream"];
  if (lower.includes("drop")) return FORM_ICON_MAP["Drops"];
  if (lower.includes("powder") || lower.includes("sachet")) return FORM_ICON_MAP["Powder"];
  if (lower.includes("inhaler") || lower.includes("inhalation")) return FORM_ICON_MAP["Inhaler"];
  // Default fallback
  return { img: "/images/icons/drug_icon.png", bg: "bg-gray-50" };
};

function DrugRow({ drug }) {
  const name = drug.drug_name || getVal(drug, "drug_name") || drug.brand_name || getVal(drug, "brand_name") || "Drug";
  const form = getVal(drug, "dosage_form") || getVal(drug, "form") || drug.dosage_form || "";
  const strength = getVal(drug, "dosage_strength") || getVal(drug, "strength") || drug.dosage_strength || "";
  const description = getVal(drug, "description") || getVal(drug, "indications") || drug.description || drug.indications || "";
  const drugType = getVal(drug, "drug_type") || drug.drug_type || "OTC";
  const tags = [];
  const indications = getVal(drug, "indications") || drug.indications;
  if (indications) {
    const arr = Array.isArray(indications) ? indications : indications.split(",");
    arr.slice(0, 2).forEach((t) => { if (t.trim()) tags.push(t.trim()); });
  }
  if (tags.length === 0) {
    const symptoms = drug.symptoms || getVal(drug, "symptoms");
    if (Array.isArray(symptoms)) symptoms.slice(0, 2).forEach((s) => tags.push(s));
    else {
      const cat = getVal(drug, "category") || drug.category || drug.drug_class;
      if (cat) tags.push(cat);
    }
  }

  // Consistent rating based on name
  const ratingNum = (4 + ((name.charCodeAt(0) + name.length) % 10) / 10).toFixed(1);
  const ratingCount = ((name.charCodeAt(0) * 7) % 150) + 20;

  const icon = getDrugIcon(form);

  return (
    <div onClick={() => window.__setSelectedDrug?.(drug)} className="cursor-pointer">
      <div className="bg-white rounded-xl border border-gray-100 px-6 py-6 hover:shadow-md transition-all cursor-pointer group">
        <div className="flex items-start gap-5">
          {/* Drug Icon */}
          <div className={`w-[64px] h-[64px] ${icon.bg} rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-100`}>
            <img src={icon.img} alt={form || "drug"} className="w-[160px] h-[160px] object-cover object-center" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Top row: name + type badge */}
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <h3 className="text-base font-bold text-gray-900 group-hover:text-[#5b2bce] transition-colors capitalize">{name}</h3>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${drugType === "Rx Only" || drugType === "Prescription" ? "bg-indigo-50 text-indigo-600 border border-indigo-200" : "bg-green-50 text-green-600 border border-green-200"}`}>
                {drugType === "Prescription" ? "Rx Only" : drugType || "OTC"}
              </span>
            </div>

            {/* Form + Strength */}
            <p className="text-sm text-gray-500 mb-1.5">
              {[form, strength].filter(Boolean).join(" • ")}
            </p>

            {/* Description */}
            {description && (
              <p className="text-sm text-gray-400 mb-4 line-clamp-1">{Array.isArray(description) ? description.join(", ") : description}</p>
            )}

            {/* Bottom row: tags left, rating + view details right */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="bg-indigo-50 text-[#5b2bce] px-3 py-1 rounded-lg text-xs font-semibold border border-indigo-100">{tag}</span>
                ))}
              </div>
              <div className="flex items-center gap-5">
                <div className="flex items-center gap-1">
                  <span className="text-amber-400 text-base">★</span>
                  <span className="text-sm font-bold text-gray-800">{ratingNum}</span>
                  <span className="text-xs text-gray-400">({ratingCount})</span>
                </div>
                <span className="text-sm text-[#5b2bce] font-semibold group-hover:underline flex items-center gap-1">
                  View Details <span>→</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Drug Card (Grid View) ────────────────────────────────────────────────────
function DrugCard({ drug }) {
  const name = drug.drug_name || getVal(drug, "drug_name") || drug.brand_name || getVal(drug, "brand_name") || "Drug";
  const form = getVal(drug, "dosage_form") || drug.dosage_form || "";
  const strength = getVal(drug, "dosage_strength") || drug.dosage_strength || "";
  const description = getVal(drug, "description") || getVal(drug, "indications") || drug.description || "";
  const drugType = getVal(drug, "drug_type") || drug.drug_type || "OTC";
  const icon = getDrugIcon(form);
  const ratingNum = (4 + ((name.charCodeAt(0) + name.length) % 10) / 10).toFixed(1);

  return (
    <div onClick={() => window.__setSelectedDrug?.(drug)} className="cursor-pointer">
      <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all cursor-pointer group">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-[52px] h-[52px] ${icon.bg} rounded-xl flex items-center justify-center overflow-hidden border border-gray-100`}>
            <img src={icon.img} alt={form || "drug"} className="w-[130px] h-[130px] object-cover object-center" />
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${drugType === "Prescription" ? "bg-indigo-50 text-indigo-600 border border-indigo-200" : "bg-green-50 text-green-600 border border-green-200"}`}>
            {drugType || "OTC"}
          </span>
        </div>
        <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#5b2bce] capitalize mb-1">{name}</h3>
        <p className="text-xs text-gray-400 mb-1.5">{[form, strength].filter(Boolean).join(" • ")}</p>
        {description && <p className="text-xs text-gray-500 line-clamp-1 mb-3">{Array.isArray(description) ? description.join(", ") : description}</p>}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-amber-400 text-sm">★</span>
            <span className="text-sm font-bold text-gray-800">{ratingNum}</span>
          </div>
          <span className="text-xs text-[#5b2bce] font-semibold group-hover:underline">View Details →</span>
        </div>
      </div>
    </div>
  );
}
