"use client";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { get } from "@/lib/api";
import { HiOutlineSearch, HiOutlineX, HiOutlineChevronDown } from "react-icons/hi";
import { MdOutlineList, MdOutlineGridView } from "react-icons/md";

const getVal = (drug, key) => { const v = drug?.field_values?.find((f) => f.key === key)?.value; if (Array.isArray(v)) return v.join(", "); return v || ""; };

const unique = (arr) => [...new Set(arr.filter(Boolean))].sort();

export default function DoctorDrugSearch() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [sortBy, setSortBy] = useState("az");
  const [filterType, setFilterType] = useState("all");
  const [filterForm, setFilterForm] = useState("all");
  const [filterStrength, setFilterStrength] = useState("all");
  const [filterBrand, setFilterBrand] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [openDropdown, setOpenDropdown] = useState(null);
  const [categorySearch, setCategorySearch] = useState("");
  const dropdownRef = useRef(null);

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => { if (!dropdownRef.current?.contains(e.target)) setOpenDropdown(null); };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Build filter options dynamically from actual data
  const types = unique(drugs.map((d) => d.prescription_type || (d.prescription_required ? "Rx" : null)));
  const forms = unique(drugs.map((d) => d.dosage_form || getVal(d, "dosage_form")));
  const strengths = unique(drugs.map((d) => d.strength || getVal(d, "strength") || d.dosage_strength));
  const brands = unique(drugs.map((d) => d.brand_name || getVal(d, "brand_name")));
  const categories = unique(drugs.map((d) => d.therapeutic_category || d.drug_class || getVal(d, "therapeutic_category")));

  // Apply filters
  const filtered = drugs.filter((drug) => {
    const name = (drug.drug_name || getVal(drug, "drug_name") || "").toLowerCase();
    const brand = (drug.brand_name || getVal(drug, "brand_name") || "").toLowerCase();
    const generic = (drug.generic_name || getVal(drug, "generic_name") || "").toLowerCase();
    const category = (drug.therapeutic_category || drug.drug_class || getVal(drug, "therapeutic_category") || "").toLowerCase();
    const drugForm = drug.dosage_form || getVal(drug, "dosage_form") || "";
    const drugStrength = drug.strength || getVal(drug, "strength") || drug.dosage_strength || "";
    const drugBrand = drug.brand_name || getVal(drug, "brand_name") || "";
    const drugType = drug.prescription_type || (drug.prescription_required ? "Rx" : "");
    const drugCat = drug.therapeutic_category || drug.drug_class || getVal(drug, "therapeutic_category") || "";

    const q = search.toLowerCase();
    const matchSearch = !q || name.includes(q) || brand.includes(q) || generic.includes(q) || category.includes(q);
    const matchType = filterType === "all" || drugType === filterType;
    const matchForm = filterForm === "all" || drugForm === filterForm;
    const matchStrength = filterStrength === "all" || drugStrength === filterStrength;
    const matchBrand = filterBrand === "all" || drugBrand === filterBrand;
    const matchCategory = filterCategory === "all" || drugCat === filterCategory;

    return matchSearch && matchType && matchForm && matchStrength && matchBrand && matchCategory;
  }).sort((a, b) => {
    if (sortBy === "az") return (a.drug_name || "").localeCompare(b.drug_name || "");
    if (sortBy === "za") return (b.drug_name || "").localeCompare(a.drug_name || "");
    return 0;
  });

  // Navigate to drug details
  if (typeof window !== "undefined") {
    window.__setSelectedDrug = (drug) => {
      sessionStorage.setItem("selectedDrugData", JSON.stringify(drug));
      router.push(`/doctor/drug-details/${drug.id || drug._id || encodeURIComponent(drug.drug_name)}`);
    };
  }

  const activeFilterCount = [filterType, filterForm, filterStrength, filterBrand, filterCategory].filter((v) => v !== "all").length;

  const clearAll = () => { setFilterType("all"); setFilterForm("all"); setFilterStrength("all"); setFilterBrand("all"); setFilterCategory("all"); };

  const FilterDropdown = ({ label, value, onChange, options }) => {
    const isOpen = openDropdown === label;
    const isActive = value !== "all";
    const [localSearch, setLocalSearch] = useState("");
    const filtered = localSearch ? options.filter((o) => o.toLowerCase().includes(localSearch.toLowerCase())) : options;
    return (
      <div className="relative">
        <button onClick={() => { setOpenDropdown(isOpen ? null : label); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-xs font-medium transition-colors ${isActive ? "border-[#5b2bce] bg-indigo-50 text-[#5b2bce]" : "border-gray-200 text-gray-700 bg-white hover:border-gray-300"}`}>
          {isActive ? (value.length > 12 ? value.slice(0, 12) + "…" : value) : label}
          <HiOutlineChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>
        {isOpen && (
          <div className="absolute top-full left-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-30 w-52 py-1">
            {/* Search inside dropdown */}
            <div className="px-2 py-1.5 border-b border-gray-100">
              <input
                type="text"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Search..."
                autoFocus
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-[#5b2bce]"
              />
            </div>
            <div className="max-h-48 overflow-y-auto">
              <button onClick={() => { onChange("all"); setOpenDropdown(null); setLocalSearch(""); }}
                className={`w-full px-3 py-2 text-left text-xs transition-colors ${value === "all" ? "bg-indigo-50 text-[#5b2bce] font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
                All
              </button>
              {filtered.length === 0 && <p className="px-3 py-2 text-xs text-gray-400">No matches</p>}
              {filtered.map((opt) => (
                <button key={opt} onClick={() => { onChange(opt); setOpenDropdown(null); setLocalSearch(""); }}
                  className={`w-full px-3 py-2 text-left text-xs transition-colors ${value === opt ? "bg-indigo-50 text-[#5b2bce] font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5" ref={dropdownRef}>
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Drug Search</h1>
        <p className="text-sm text-gray-500">Search for medicines, indications, dosage, and more</p>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <HiOutlineSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for medicines, indications, dosage..."
            className="w-full pl-12 pr-10 py-3.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition-all bg-white" />
          {search && <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><HiOutlineX className="w-4 h-4" /></button>}
        </div>
      </div>

      {/* Dynamic Filter Chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <FilterDropdown label="Type" value={filterType} onChange={setFilterType} options={types} />
        <FilterDropdown label="Form" value={filterForm} onChange={setFilterForm} options={forms} />
        <FilterDropdown label="Strength" value={filterStrength} onChange={setFilterStrength} options={strengths} />
        <FilterDropdown label="Brand" value={filterBrand} onChange={setFilterBrand} options={brands} />
        <FilterDropdown label="Category" value={filterCategory} onChange={setFilterCategory} options={categories} />
        {activeFilterCount > 0 && (
          <button onClick={clearAll} className="text-xs text-[#5b2bce] font-semibold hover:underline ml-1">
            Clear All ({activeFilterCount})
          </button>
        )}
      </div>

      {/* Results + Sidebar Layout */}
      <div className="flex gap-5">
        {/* Main Results */}
        <div className="flex-1 min-w-0">
          {/* Results bar */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              Found <span className="font-bold text-[#5b2bce]">{filtered.length}</span> results{search && <> for "<span className="font-semibold text-gray-700">{search}</span>"</>}
              {activeFilterCount > 0 && <span className="text-xs text-gray-400 ml-1">({activeFilterCount} filter{activeFilterCount > 1 ? "s" : ""} active)</span>}
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>Sort by:</span>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-xs font-medium bg-white outline-none">
                  <option value="az">A → Z</option>
                  <option value="za">Z → A</option>
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
            {types.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Type</p>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="radio" name="type" checked={filterType === "all"} onChange={() => setFilterType("all")} className="w-3.5 h-3.5 text-[#5b2bce]" />
                    All
                  </label>
                  {types.map((t) => (
                    <label key={t} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                      <input type="radio" name="type" checked={filterType === t} onChange={() => setFilterType(t)} className="w-3.5 h-3.5 text-[#5b2bce]" />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Form */}
            {forms.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Form</p>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                    <input type="radio" name="form" checked={filterForm === "all"} onChange={() => setFilterForm("all")} className="w-3.5 h-3.5 text-[#5b2bce]" />
                    All
                  </label>
                  {forms.map((f) => (
                    <label key={f} className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                      <input type="radio" name="form" checked={filterForm === f} onChange={() => setFilterForm(f)} className="w-3.5 h-3.5 text-[#5b2bce]" />
                      {f}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Category — searchable dropdown */}
            {categories.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Category</p>
                <div className="relative">
                  <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none focus:ring-1 focus:ring-[#5b2bce] appearance-none"
                  >
                    <option value="all">All Categories</option>
                    {categories
                      .filter((c) => !categorySearch || c.toLowerCase().includes(categorySearch.toLowerCase()))
                      .map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <HiOutlineChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                </div>
                {/* Category search */}
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="Filter categories..."
                  className="mt-1.5 w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none focus:ring-1 focus:ring-[#5b2bce]"
                />
              </div>
            )}

            {/* Strength */}
            {strengths.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-700 mb-2">Strength</p>
                <select value={filterStrength} onChange={(e) => setFilterStrength(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none focus:ring-1 focus:ring-[#5b2bce]">
                  <option value="all">All Strengths</option>
                  {strengths.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            )}

            {activeFilterCount > 0 && (
              <button onClick={clearAll} className="w-full text-xs text-[#5b2bce] hover:underline font-semibold text-center">
                Clear All Filters
              </button>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Drug Form Icon mapping to actual PNG images ──────────────────────────────
const FORM_ICON_MAP = {
  "Tablet": { img: "/drx/images/icons/drug_icon.png", bg: "bg-blue-50" },
  "Capsule": { img: "/drx/images/icons/drug_icon.png", bg: "bg-indigo-50" },
  "Syrup": { img: "/drx/images/icons/syrup_icon.png", bg: "bg-green-50" },
  "Injection": { img: "/drx/images/icons/injection_icon.png", bg: "bg-purple-50" },
  "Cream": { img: "/drx/images/icons/ointment_icon.png", bg: "bg-yellow-50" },
  "Ointment": { img: "/drx/images/icons/ointment_icon.png", bg: "bg-yellow-50" },
  "Drops": { img: "/drx/images/icons/syrup_icon.png", bg: "bg-violet-50" },
  "Powder": { img: "/drx/images/icons/Powder.png", bg: "bg-amber-50" },
  "Inhaler": { img: "/drx/images/icons/inhaler_icon.png", bg: "bg-sky-50" },
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
  return { img: "/drx/images/icons/drug_icon.png", bg: "bg-gray-50" };
};

function DrugRow({ drug }) {
  const name = drug.drug_name || getVal(drug, "drug_name") || drug.brand_name || getVal(drug, "brand_name") || "Drug";
  const form = getVal(drug, "dosage_form") || getVal(drug, "form") || drug.dosage_form || "";
  const strength = getVal(drug, "dosage_strength") || getVal(drug, "strength") || drug.dosage_strength || "";
  const description = getVal(drug, "description") || getVal(drug, "indications") || drug.description || drug.indications || "";
  const drugType = drug.prescription_type || getVal(drug, "drug_type") || drug.drug_type || "";
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
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${drugType === "Rx Only" || drugType === "Prescription" || drugType === "Rx" ? "bg-indigo-50 text-indigo-600 border border-indigo-200" : drugType ? "bg-green-50 text-green-600 border border-green-200" : "hidden"}`}>
                {drugType === "Prescription" || drugType === "Rx" ? "Rx" : drugType || ""}
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

            {/* Bottom row: tags left, view details right */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2">
                {tags.map((tag) => (
                  <span key={tag} className="bg-indigo-50 text-[#5b2bce] px-3 py-1 rounded-lg text-xs font-semibold border border-indigo-100">{tag}</span>
                ))}
              </div>
              <span className="text-sm text-[#5b2bce] font-semibold group-hover:underline flex items-center gap-1">
                View Details <span>→</span>
              </span>
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
  const drugType = drug.prescription_type || getVal(drug, "drug_type") || drug.drug_type || "";
  const icon = getDrugIcon(form);

  return (
    <div onClick={() => window.__setSelectedDrug?.(drug)} className="cursor-pointer">
      <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition-all cursor-pointer group">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-[52px] h-[52px] ${icon.bg} rounded-xl flex items-center justify-center overflow-hidden border border-gray-100`}>
            <img src={icon.img} alt={form || "drug"} className="w-[130px] h-[130px] object-cover object-center" />
          </div>
          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${drugType === "Rx" || drugType === "Prescription" ? "bg-indigo-50 text-indigo-600 border border-indigo-200" : drugType ? "bg-green-50 text-green-600 border border-green-200" : "hidden"}`}>
            {drugType === "Prescription" || drugType === "Rx" ? "Rx" : drugType}
          </span>
        </div>
        <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#5b2bce] capitalize mb-1">{name}</h3>
        <p className="text-xs text-gray-400 mb-1.5">{[form, strength].filter(Boolean).join(" • ")}</p>
        {description && <p className="text-xs text-gray-500 line-clamp-1 mb-3">{Array.isArray(description) ? description.join(", ") : description}</p>}
        <div className="flex items-center justify-end">
          <span className="text-xs text-[#5b2bce] font-semibold group-hover:underline">View Details →</span>
        </div>
      </div>
    </div>
  );
}
