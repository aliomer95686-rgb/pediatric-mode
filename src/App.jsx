import React, { useState, useMemo } from "react";

/* ---------- Design tokens ---------- */
const INK = "#1B2B2E";
const BG = "#F5F8F7";
const SURFACE = "#FFFFFF";
const TEAL = "#0E6E66";
const TEAL_DARK = "#0A4F49";
const RED = "#B23B3B";
const RED_BG = "#FBECEC";
const AMBER = "#B5711F";
const AMBER_BG = "#FBF2E6";
const GREEN = "#2F7A4F";
const GREEN_BG = "#EAF5EE";
const BLUE = "#2A5C8A";
const BLUE_BG = "#EAF1F7";
const PURPLE = "#6B4A8A";
const PURPLE_BG = "#F1EBF6";
const CRIT = "#7A1F1F";
const CRIT_BG = "#F7DEDE";
const BORDER = "#DCE3E1";
const MUTED = "#5C6E6C";

/* ---------- Shared helpers ---------- */
function round(n, step) { return Math.round(n / step) * step; }
function fmt(n, d) {
  if (n === null || n === undefined || Number.isNaN(n)) return "\u2014";
  if (d !== undefined) return Number(n.toFixed(d)).toString();
  return n % 1 === 0 ? n.toString() : n.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

const AGE_BANDS = [
  { id: "infant", label: "< 1 yr", maxMonths: 12, hr: [100, 160], rr: [30, 40] },
  { id: "toddler", label: "1\u20132 yr", maxMonths: 24, hr: [90, 150], rr: [25, 35] },
  { id: "preschool", label: "2\u20135 yr", maxMonths: 60, hr: [80, 140], rr: [20, 30] },
  { id: "school", label: "5\u201312 yr", maxMonths: 144, hr: [70, 120], rr: [16, 24] },
  { id: "adolescent", label: "> 12 yr", maxMonths: Infinity, hr: [60, 100], rr: [12, 20] },
];
function bandForAge(months) {
  return AGE_BANDS.find((b) => months <= b.maxMonths) || AGE_BANDS[AGE_BANDS.length - 1];
}
function estimateWeight(ageYears) {
  if (ageYears < 1) return round(ageYears * 12 * 0.5 + 4, 0.1);
  if (ageYears <= 10) return round((ageYears + 4) * 2, 0.1);
  return round(ageYears * 3 + 7, 0.1);
}
function vitalStatus(value, range) {
  if (value === "" || value === null || Number.isNaN(value)) return null;
  const [lo, hi] = range;
  const span = hi - lo;
  if (value >= lo && value <= hi) return "normal";
  if (value < lo - span * 0.25 || value > hi + span * 0.25) return "red";
  return "amber";
}
const STATUS_STYLE = {
  normal: { color: GREEN, bg: GREEN_BG, label: "Normal for age" },
  amber: { color: AMBER, bg: AMBER_BG, label: "Mildly abnormal" },
  red: { color: RED, bg: RED_BG, label: "Markedly abnormal" },
};

/* ---------- Small shared UI ---------- */
function Field({ label, unit, value, onChange, placeholder }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "8px 10px", background: SURFACE }}>
        <input type="number" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          style={{ width: "100%", border: "none", outline: "none", fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: INK, background: "transparent" }} />
        <span style={{ fontSize: 12, color: MUTED, fontWeight: 600 }}>{unit}</span>
      </div>
    </div>
  );
}
function Chip({ status }) {
  if (!status) return null;
  const s = STATUS_STYLE[status];
  return <div style={{ display: "inline-block", marginTop: 4, fontSize: 11, fontWeight: 700, color: s.color, background: s.bg, borderRadius: 6, padding: "3px 8px" }}>{s.label}</div>;
}
function SelectGroup({ options, value, onChange }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {options.map((o) => (
        <button key={o.id} onClick={() => onChange(o.id)}
          style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, border: `1px solid ${value === o.id ? TEAL : BORDER}`,
            background: value === o.id ? "#E6F1F0" : SURFACE, color: value === o.id ? TEAL_DARK : INK, fontWeight: value === o.id ? 700 : 500, fontSize: 14, cursor: "pointer" }}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
function Toggle({ label, value, onChange, activeColor = TEAL, activeBg = "#E6F1F0" }) {
  return (
    <button onClick={() => onChange(!value)}
      style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10,
        border: `1px solid ${value ? activeColor : BORDER}`, background: value ? activeBg : SURFACE, cursor: "pointer" }}>
      <span style={{ fontSize: 13, fontWeight: 700, color: value ? activeColor : INK }}>{label}</span>
      <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: value ? activeColor : MUTED, borderRadius: 6, padding: "3px 9px" }}>{value ? "YES" : "NO"}</span>
    </button>
  );
}
function SectionLabel({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 700, color: MUTED, marginBottom: 8 }}>{children}</div>;
}

/* ================= Active Patient Bar ================= */
function PatientBar({ patient, setPatient }) {
  const ageNum = parseFloat(patient.ageMonths);
  const hasAge = !Number.isNaN(ageNum) && ageNum > 0;
  const band = hasAge ? bandForAge(ageNum) : null;
  const estWeight = hasAge ? estimateWeight(ageNum / 12) : null;

  const manualWeight = parseFloat(patient.weightKg);
  const hasManualWeight = !Number.isNaN(manualWeight) && manualWeight > 0;
  const effectiveWeight = hasManualWeight ? manualWeight : estWeight;
  const hasWeight = !!effectiveWeight;

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 20, background: SURFACE, borderBottom: `2px solid ${hasWeight ? TEAL : RED}`, boxShadow: "0 1px 0 rgba(0,0,0,0.03)" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "10px 20px" }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>
          Active Patient
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: MUTED }}>Age (months)</div>
            <input type="number" inputMode="decimal" value={patient.ageMonths}
              onChange={(e) => setPatient((p) => ({ ...p, ageMonths: e.target.value }))}
              placeholder="\u2014"
              style={{ width: "100%", fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums", border: "none", outline: "none", background: "transparent", color: hasAge ? INK : RED }} />
            <div style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>{band ? band.label : "enter age"}</div>
          </div>
          <div style={{ width: 1, background: BORDER }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: MUTED }}>Weight (kg)</div>
            <input type="number" inputMode="decimal" value={patient.weightKg}
              onChange={(e) => setPatient((p) => ({ ...p, weightKg: e.target.value }))}
              placeholder={estWeight ? `est. ${fmt(estWeight)}` : "\u2014"}
              style={{ width: "100%", fontSize: 20, fontWeight: 800, fontVariantNumeric: "tabular-nums", border: "none", outline: "none", background: "transparent", color: hasManualWeight ? INK : hasWeight ? MUTED : RED }} />
            <div style={{ fontSize: 11, color: MUTED, fontWeight: 600 }}>{hasManualWeight ? "entered" : hasWeight ? "estimated from age" : "enter weight or age"}</div>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <Toggle label="Severe acute malnutrition (SAM)?" value={patient.isSam} onChange={(v) => setPatient((p) => ({ ...p, isSam: v }))} activeColor={PURPLE} activeBg={PURPLE_BG} />
        </div>
        {!hasWeight && (
          <div style={{ marginTop: 6, fontSize: 12, color: RED, fontWeight: 600 }}>
            One weight or age here drives every module below \u2014 nothing calculates without it.
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= Dosing & Fluids ================= */
const DRUGS = [
  { id: "paracetamol", name: "Paracetamol (oral)", mgPerKg: 15, maxMg: 1000, concMgPer5mL: 120, note: "Every 4\u20136h, max 4 doses/24h" },
  { id: "ibuprofen", name: "Ibuprofen (oral)", mgPerKg: 10, maxMg: 400, concMgPer5mL: 100, note: "Every 6\u20138h, avoid if dehydrated" },
  { id: "adrenaline-im", name: "Adrenaline (IM, anaphylaxis, 1:1000)", mgPerKg: 0.01, maxMg: 0.5, concMgPer5mL: null, note: "Repeat every 5\u201315 min as needed" },
  { id: "adrenaline-arrest", name: "Adrenaline (IV/IO, arrest, 1:10,000)", mgPerKg: 0.01, maxMg: 1, concMgPer5mL: null, note: "Repeat every 3\u20135 min per algorithm" },
  { id: "midazolam", name: "Midazolam (buccal/intranasal, seizure)", mgPerKg: 0.3, maxMg: 10, concMgPer5mL: null, note: "One repeat dose if seizure continues" },
  { id: "diazepam-pr", name: "Diazepam (rectal, seizure)", mgPerKg: 0.5, maxMg: 20, concMgPer5mL: null, note: "One repeat dose if seizure continues" },
  { id: "ceftriaxone", name: "Ceftriaxone (IV/IM)", mgPerKg: 50, maxMg: 2000, concMgPer5mL: null, note: "Per day, once or twice daily per protocol" },
];

function DosingScreen({ patient, weight, hasWeight, onDoseCalculated }) {
  const [tab, setTab] = useState("drug");
  const [drugId, setDrugId] = useState(DRUGS[0].id);
  const [fluidType, setFluidType] = useState("maintenance");
  const [boluspreset, setBolusPreset] = useState(20);
  const isSam = patient.isSam;
  const drug = DRUGS.find((d) => d.id === drugId);

  const doseCalc = useMemo(() => {
    if (!hasWeight || !drug) return null;
    const rawMg = weight * drug.mgPerKg;
    const capped = rawMg > drug.maxMg;
    const finalMg = capped ? drug.maxMg : rawMg;
    const roundStep = finalMg < 1 ? 0.01 : finalMg < 10 ? 0.1 : 1;
    const roundedMg = round(finalMg, roundStep);
    const mL = drug.concMgPer5mL ? round((roundedMg / drug.concMgPer5mL) * 5, 0.1) : null;
    return { rawMg, capped, roundedMg, mL };
  }, [weight, drug, hasWeight]);

  const maintenanceCalc = useMemo(() => {
    if (!hasWeight) return null;
    let dailyML = 0;
    if (weight <= 10) dailyML = weight * 100;
    else if (weight <= 20) dailyML = 1000 + (weight - 10) * 50;
    else dailyML = 1500 + (weight - 20) * 20;
    return { dailyML: round(dailyML, 1), hourlyML: round(dailyML / 24, 0.1) };
  }, [weight, hasWeight]);

  const effectiveBolusRate = isSam ? 15 : boluspreset;
  const bolusCalc = useMemo(() => {
    if (!hasWeight) return null;
    return { mL: round(weight * effectiveBolusRate, 1), highVolume: !isSam && effectiveBolusRate >= 20 };
  }, [weight, effectiveBolusRate, hasWeight, isSam]);

  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", background: SURFACE, borderRadius: 10, padding: 4, border: `1px solid ${BORDER}`, marginBottom: 16 }}>
        {[{ id: "drug", label: "Drug dose" }, { id: "fluids", label: "Fluids" }].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ flex: 1, padding: "10px 0", border: "none", borderRadius: 7, background: tab === t.id ? TEAL : "transparent", color: tab === t.id ? "#fff" : MUTED, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "drug" && (
        <div>
          <select value={drugId} onChange={(e) => setDrugId(e.target.value)}
            style={{ width: "100%", padding: "12px 14px", fontSize: 15, fontWeight: 600, borderRadius: 10, border: `1px solid ${BORDER}`, background: SURFACE, color: INK }}>
            {DRUGS.map((d) => (<option key={d.id} value={d.id}>{d.name}</option>))}
          </select>
          <div style={{ fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>{drug.mgPerKg} mg/kg \u00b7 max {drug.maxMg} mg \u00b7 {drug.note}</div>
          {isSam && (
            <div style={{ marginTop: 10, fontSize: 12, color: PURPLE, fontWeight: 600, lineHeight: 1.5, background: PURPLE_BG, borderRadius: 8, padding: "8px 10px" }}>
              SAM flagged \u2014 use current (non-oedematous) weight where possible; pharmacokinetics can be altered.
            </div>
          )}
          <div style={{ marginTop: 16, background: doseCalc?.capped ? AMBER_BG : SURFACE, border: `1px solid ${doseCalc?.capped ? AMBER : BORDER}`, borderRadius: 14, padding: 20 }}>
            {!doseCalc ? (
              <div style={{ color: MUTED, fontSize: 14 }}>Enter weight in the Active Patient bar to see the calculated dose.</div>
            ) : (
              <>
                <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em" }}>Calculated dose</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                  <div style={{ fontSize: 34, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{fmt(doseCalc.roundedMg)}</div>
                  <div style={{ fontSize: 16, fontWeight: 600, color: MUTED }}>mg</div>
                  {doseCalc.mL !== null && <div style={{ fontSize: 16, fontWeight: 600, color: MUTED }}>({fmt(doseCalc.mL)} mL)</div>}
                </div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
                  {fmt(weight)} kg \u00d7 {drug.mgPerKg} mg/kg = {fmt(round(doseCalc.rawMg, 0.01))} mg
                </div>
                {doseCalc.capped && (
                  <div style={{ marginTop: 12, background: AMBER_BG, border: `1px solid ${AMBER}`, borderRadius: 8, padding: "10px 12px" }}>
                    <span style={{ fontSize: 13, color: AMBER, fontWeight: 600 }}>! Exceeds adult max ({drug.maxMg} mg) \u2014 capped.</span>
                  </div>
                )}
                <button onClick={() => onDoseCalculated({ name: drug.name, mg: doseCalc.roundedMg, mL: doseCalc.mL })}
                  style={{ marginTop: 14, width: "100%", padding: "10px 0", borderRadius: 8, border: "none", background: TEAL, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                  Save to handoff summary
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {tab === "fluids" && (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            {[{ id: "maintenance", label: "Maintenance" }, { id: "bolus", label: "Bolus" }].map((f) => (
              <button key={f.id} onClick={() => setFluidType(f.id)}
                style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: `1px solid ${fluidType === f.id ? TEAL : BORDER}`, background: fluidType === f.id ? "#E6F1F0" : SURFACE, color: fluidType === f.id ? TEAL_DARK : MUTED, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                {f.label}
              </button>
            ))}
          </div>

          {fluidType === "maintenance" && (
            <div>
              {isSam && (
                <div style={{ marginBottom: 12, fontSize: 12, color: PURPLE, fontWeight: 600, lineHeight: 1.5, background: PURPLE_BG, borderRadius: 8, padding: "10px 12px" }}>
                  SAM flagged \u2014 IV maintenance fluid is generally avoided during stabilization; feeds (F-75) usually supply fluid needs. Verify against SAM protocol.
                </div>
              )}
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20 }}>
                {!maintenanceCalc ? (
                  <div style={{ color: MUTED, fontSize: 14 }}>Enter weight above to see maintenance fluid rate.</div>
                ) : (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: "uppercase" }}>Maintenance rate (Holliday\u2013Segar)</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                      <div style={{ fontSize: 34, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{fmt(maintenanceCalc.hourlyML)}</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: MUTED }}>mL/hr</div>
                    </div>
                    <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>{fmt(maintenanceCalc.dailyML)} mL / 24h total</div>
                  </>
                )}
              </div>
            </div>
          )}

          {fluidType === "bolus" && (
            <div>
              {isSam ? (
                <div style={{ marginBottom: 12, fontSize: 12, color: PURPLE, fontWeight: 600, lineHeight: 1.5, background: PURPLE_BG, borderRadius: 8, padding: "10px 12px" }}>
                  SAM flagged \u2014 rate fixed to reduced SAM shock regimen (15 mL/kg over 1 hour, Ringer's lactate or half-strength Darrow's + 5% dextrose). Only use if shock confirmed.
                </div>
              ) : (
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {[10, 20].map((p) => (
                    <button key={p} onClick={() => setBolusPreset(p)}
                      style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: `1px solid ${boluspreset === p ? TEAL : BORDER}`, background: boluspreset === p ? "#E6F1F0" : SURFACE, color: boluspreset === p ? TEAL_DARK : MUTED, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                      {p} mL/kg
                    </button>
                  ))}
                </div>
              )}
              <div style={{ background: isSam ? PURPLE_BG : bolusCalc?.highVolume ? AMBER_BG : SURFACE, border: `1px solid ${isSam ? PURPLE : bolusCalc?.highVolume ? AMBER : BORDER}`, borderRadius: 14, padding: 20 }}>
                {!bolusCalc ? (
                  <div style={{ color: MUTED, fontSize: 14 }}>Enter weight above to see bolus volume.</div>
                ) : (
                  <>
                    <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: "uppercase" }}>Bolus volume</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                      <div style={{ fontSize: 34, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{fmt(bolusCalc.mL)}</div>
                      <div style={{ fontSize: 16, fontWeight: 600, color: MUTED }}>mL</div>
                    </div>
                    <div style={{ fontSize: 13, color: MUTED, marginTop: 6 }}>
                      {fmt(weight)} kg \u00d7 {effectiveBolusRate} mL/kg, over {isSam ? "1 hour" : "15\u201360 min per clinical status"}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
/* ================= Vitals & PEWS + Safety Guard ================= */
const BEHAVIOR_OPTIONS = [
  { id: 0, label: "Playing / appropriate" }, { id: 1, label: "Sleepy but consolable" },
  { id: 2, label: "Irritable, hard to console" }, { id: 3, label: "Lethargic / reduced response to pain" },
];
const RESP_EFFORT_OPTIONS = [
  { id: 0, label: "Normal" }, { id: 1, label: "Mild recession or tachypnoea" },
  { id: 2, label: "Moderate recession, accessory muscles" }, { id: 3, label: "Severe recession, grunting, or apnoea" },
];
const CAP_REFILL_OPTIONS = [
  { id: 0, label: "< 2 sec, pink" }, { id: 1, label: "2\u20133 sec, or mottled" },
  { id: 2, label: "> 3 sec" }, { id: 3, label: "> 4 sec, grey/cyanosed" },
];
function scoreFromStatus(status) { if (status === "normal") return 0; if (status === "amber") return 1; if (status === "red") return 2; return 0; }
function riskTier(total) {
  if (total <= 2) return { label: "Low", color: GREEN, bg: GREEN_BG, action: "Routine monitoring per ward schedule." };
  if (total <= 4) return { label: "Medium", color: AMBER, bg: AMBER_BG, action: "Increase monitoring frequency. Review by treating team." };
  return { label: "High", color: RED, bg: RED_BG, action: "Urgent senior review. Consider escalation." };
}

function VitalsScreen({ patient, band, hasAge, vitals, setVitals, onPewsCalculated }) {
  const hrNum = parseFloat(vitals.hr), rrNum = parseFloat(vitals.rr), spo2Num = parseFloat(vitals.spo2), tempNum = parseFloat(vitals.temp);
  const hrStatus = band && !Number.isNaN(hrNum) ? vitalStatus(hrNum, band.hr) : null;
  const rrStatus = band && !Number.isNaN(rrNum) ? vitalStatus(rrNum, band.rr) : null;
  const spo2Status = !Number.isNaN(spo2Num) ? (spo2Num >= 95 ? "normal" : spo2Num >= 90 ? "amber" : "red") : null;
  const tempStatus = !Number.isNaN(tempNum) ? (tempNum < 36 ? "red" : tempNum >= 38 ? "amber" : "normal") : null;
  const isTachycardic = band && !Number.isNaN(hrNum) ? hrNum > band.hr[1] : false;
  const isBradycardic = band && !Number.isNaN(hrNum) ? hrNum < band.hr[0] : false;
  const isTachypneic = band && !Number.isNaN(rrNum) ? rrNum > band.rr[1] : false;
  const feverOrHypothermia = tempStatus === "amber" || tempStatus === "red";
  const alteredMentalState = vitals.behavior !== null && vitals.behavior >= 1;
  const markedlyAltered = vitals.behavior !== null && vitals.behavior >= 2;
  const delayedCapRefill = vitals.capRefill !== null && vitals.capRefill >= 1;
  const severeWorkOfBreathing = vitals.respEffort !== null && vitals.respEffort >= 2;
  const hypoxia = spo2Status === "amber" || spo2Status === "red";

  const pews = useMemo(() => {
    if (!hasAge) return null;
    const respScore = Math.max(scoreFromStatus(rrStatus), vitals.respEffort ?? 0, spo2Status === "red" ? 3 : spo2Status === "amber" ? 1 : 0);
    const cardioScore = Math.max(scoreFromStatus(hrStatus), vitals.capRefill ?? 0);
    const behaviorScore = vitals.behavior ?? 0;
    const complete = rrStatus !== null && hrStatus !== null && vitals.respEffort !== null && vitals.capRefill !== null && vitals.behavior !== null;
    return { respScore, cardioScore, behaviorScore, total: respScore + cardioScore + behaviorScore, complete };
  }, [hasAge, rrStatus, hrStatus, vitals.respEffort, vitals.capRefill, vitals.behavior, spo2Status]);

  const tier = pews ? riskTier(pews.total) : null;

  const guardPatterns = useMemo(() => ([
    { id: "sepsis", label: "Possible sepsis", detail: "Temperature abnormality + tachycardia + altered mental state.", triggered: feverOrHypothermia && isTachycardic && alteredMentalState },
    { id: "resp-failure", label: "Possible respiratory failure", detail: "Increased work of breathing / high RR with hypoxia.", triggered: (severeWorkOfBreathing || rrStatus === "red") && hypoxia },
    { id: "shock", label: "Possible shock", detail: "Tachycardia + delayed cap refill + altered mental state.", triggered: isTachycardic && delayedCapRefill && alteredMentalState },
    { id: "dka", label: "Possible DKA", detail: "Tachypnoea + altered mental state, known/suspected diabetes.", triggered: vitals.suspectedDiabetes && isTachypneic && alteredMentalState },
    { id: "pre-arrest", label: "Pre-arrest pattern", detail: "Severely reduced consciousness, PEWS \u2265 7, two red vitals, or bradycardia.", triggered: markedlyAltered || (pews && pews.total >= 7) || (hrStatus === "red" && rrStatus === "red") || isBradycardic },
  ]), [feverOrHypothermia, isTachycardic, alteredMentalState, severeWorkOfBreathing, rrStatus, hypoxia, delayedCapRefill, vitals.suspectedDiabetes, isTachypneic, markedlyAltered, pews, hrStatus, isBradycardic]);

  const triggeredPatterns = guardPatterns.filter((p) => p.triggered);
  const anyInput = hasAge && (hrStatus || rrStatus || spo2Status || tempStatus || vitals.behavior !== null || vitals.respEffort !== null || vitals.capRefill !== null);

  React.useEffect(() => {
    if (pews) onPewsCalculated({ total: pews.total, tier: tier?.label, complete: pews.complete, triggeredPatterns: triggeredPatterns.map((p) => p.label) });
  }, [pews?.total, tier?.label]); // eslint-disable-line

  return (
    <div style={{ padding: "16px 20px" }}>
      {!hasAge && <div style={{ marginBottom: 12, fontSize: 13, color: RED, fontWeight: 600 }}>Enter age in the Active Patient bar \u2014 normal ranges and PEWS are age-specific.</div>}
      <SectionLabel>VITALS</SectionLabel>
      <div style={{ display: "flex", gap: 10 }}>
        <div style={{ flex: 1 }}><Field label="Heart rate" unit="bpm" value={vitals.hr} onChange={(v) => setVitals((s) => ({ ...s, hr: v }))} placeholder={band ? `${band.hr[0]}\u2013${band.hr[1]}` : "\u2014"} /><Chip status={hrStatus} /></div>
        <div style={{ flex: 1 }}><Field label="Resp rate" unit="/min" value={vitals.rr} onChange={(v) => setVitals((s) => ({ ...s, rr: v }))} placeholder={band ? `${band.rr[0]}\u2013${band.rr[1]}` : "\u2014"} /><Chip status={rrStatus} /></div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
        <div style={{ flex: 1 }}><Field label="SpO2" unit="%" value={vitals.spo2} onChange={(v) => setVitals((s) => ({ ...s, spo2: v }))} placeholder="\u2265 95" /><Chip status={spo2Status} /></div>
        <div style={{ flex: 1 }}><Field label="Temp" unit="\u00b0C" value={vitals.temp} onChange={(v) => setVitals((s) => ({ ...s, temp: v }))} placeholder="36.5\u201337.5" /><Chip status={tempStatus} /></div>
      </div>
      <div style={{ marginTop: 12 }}>
        <Toggle label="Known or suspected diabetes?" value={vitals.suspectedDiabetes} onChange={(v) => setVitals((s) => ({ ...s, suspectedDiabetes: v }))} />
      </div>
      <div style={{ marginTop: 20 }}><SectionLabel>BEHAVIOR / CONSCIOUSNESS</SectionLabel><SelectGroup options={BEHAVIOR_OPTIONS} value={vitals.behavior} onChange={(v) => setVitals((s) => ({ ...s, behavior: v }))} /></div>
      <div style={{ marginTop: 20 }}><SectionLabel>RESPIRATORY EFFORT</SectionLabel><SelectGroup options={RESP_EFFORT_OPTIONS} value={vitals.respEffort} onChange={(v) => setVitals((s) => ({ ...s, respEffort: v }))} /></div>
      <div style={{ marginTop: 20 }}><SectionLabel>CAPILLARY REFILL</SectionLabel><SelectGroup options={CAP_REFILL_OPTIONS} value={vitals.capRefill} onChange={(v) => setVitals((s) => ({ ...s, capRefill: v }))} /></div>

      <div style={{ marginTop: 24, background: tier ? tier.bg : SURFACE, border: `1px solid ${tier ? tier.color : BORDER}`, borderRadius: 14, padding: 20 }}>
        {!pews ? <div style={{ color: MUTED, fontSize: 14 }}>Enter age to calculate PEWS.</div> : (
          <>
            <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: "uppercase" }}>PEWS total {!pews.complete && "(partial)"}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
              <div style={{ fontSize: 40, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: tier.color }}>{pews.total}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: MUTED }}>/ 9</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: tier.color, marginLeft: "auto" }}>{tier.label} risk</div>
            </div>
            <div style={{ fontSize: 13, color: INK, fontWeight: 600, marginTop: 10 }}>{tier.action}</div>
          </>
        )}
      </div>

      <div style={{ marginTop: 20 }}>
        <SectionLabel>PEDIATRIC SAFETY GUARD</SectionLabel>
        {!anyInput ? (
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20, color: MUTED, fontSize: 14 }}>Enter vitals above \u2014 the guard cross-checks combinations as you go.</div>
        ) : triggeredPatterns.length === 0 ? (
          <div style={{ background: GREEN_BG, border: `1px solid ${GREEN}`, borderRadius: 14, padding: 16, color: GREEN, fontSize: 13, fontWeight: 700 }}>No high-risk patterns detected based on current entries.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {triggeredPatterns.map((p) => {
              const crit = p.id === "pre-arrest";
              return (
                <div key={p.id} style={{ background: crit ? CRIT_BG : RED_BG, border: `1px solid ${crit ? CRIT : RED}`, borderRadius: 12, padding: "14px 16px" }}>
                  <div style={{ fontWeight: 800, color: crit ? CRIT : RED, fontSize: 15 }}>! {p.label}</div>
                  <div style={{ fontSize: 13, color: INK, marginTop: 6, lineHeight: 1.5 }}>{p.detail}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= Dehydration ================= */
const SIGNS = [
  { id: "condition", label: "General condition", options: [{ level: 0, label: "Well, alert" }, { level: 1, label: "Restless, irritable" }, { level: 2, label: "Lethargic or unconscious" }] },
  { id: "eyes", label: "Eyes", options: [{ level: 0, label: "Normal" }, { level: 1, label: "Sunken" }, { level: 2, label: "Very sunken and dry" }] },
  { id: "thirst", label: "Thirst / drinking", options: [{ level: 0, label: "Drinks normally" }, { level: 1, label: "Thirsty, drinks eagerly" }, { level: 2, label: "Unable to drink / drinks poorly" }] },
  { id: "skin", label: "Skin pinch", options: [{ level: 0, label: "Goes back immediately" }, { level: 1, label: "Goes back slowly (< 2s)" }, { level: 2, label: "Goes back very slowly (\u2265 2s)" }] },
];
const SAM_SHOCK_SIGNS = [
  { id: "samCondition", label: "Mental state", options: [{ level: 0, label: "Alert" }, { level: 2, label: "Lethargic / unconscious" }] },
  { id: "samHands", label: "Hands / extremities", options: [{ level: 0, label: "Warm" }, { level: 2, label: "Cold" }] },
  { id: "samPulse", label: "Radial pulse", options: [{ level: 0, label: "Normal" }, { level: 2, label: "Weak and fast" }] },
  { id: "samCapRefill", label: "Capillary refill", options: [{ level: 0, label: "< 3 sec" }, { level: 2, label: "\u2265 3 sec" }] },
];
function classifyDehydration(levels) {
  const values = Object.values(levels);
  if (values.length < SIGNS.length) return null;
  const severeCount = values.filter((v) => v === 2).length;
  const someCount = values.filter((v) => v >= 1).length;
  if (severeCount >= 2) return "severe";
  if (someCount >= 2) return "some";
  return "none";
}
function classifySamShock(levels) {
  const values = Object.values(levels);
  if (values.length < SAM_SHOCK_SIGNS.length) return null;
  if (levels.samCondition === 2 && levels.samHands === 2 && (levels.samCapRefill === 2 || levels.samPulse === 2)) return "shock";
  return "no-shock";
}
const TIER_INFO = {
  none: { label: "No dehydration", color: GREEN, bg: GREEN_BG, plan: "WHO Plan A" },
  some: { label: "Some dehydration", color: AMBER, bg: AMBER_BG, plan: "WHO Plan B", mlPerKg: 75, hours: 4 },
  severe: { label: "Severe dehydration", color: RED, bg: RED_BG, plan: "WHO Plan C", mlPerKg: 100 },
};
function SignBlock({ sign, levels, setLevel }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: INK, marginBottom: 8 }}>{sign.label}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {sign.options.map((opt) => {
          const active = levels[sign.id] === opt.level;
          const c = opt.level === 0 ? GREEN : opt.level === 1 ? AMBER : RED;
          return (
            <button key={opt.level} onClick={() => setLevel(sign.id, opt.level)}
              style={{ textAlign: "left", padding: "10px 12px", borderRadius: 8, border: `1px solid ${active ? c : BORDER}`, background: active ? `${c}15` : SURFACE, color: active ? c : INK, fontWeight: active ? 700 : 500, fontSize: 14, cursor: "pointer" }}>
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
function DehydrationScreen({ patient, weight, hasWeight, onClassified }) {
  const [levels, setLevels] = useState({});
  const [samLevels, setSamLevels] = useState({});
  const isSam = patient.isSam;
  const setLevel = (id, l) => setLevels((p) => ({ ...p, [id]: l }));
  const setSamLevel = (id, l) => setSamLevels((p) => ({ ...p, [id]: l }));

  const tierKey = useMemo(() => classifyDehydration(levels), [levels]);
  const tier = tierKey ? TIER_INFO[tierKey] : null;
  const volume = tier && tier.mlPerKg && hasWeight ? round(weight * tier.mlPerKg, 1) : null;
  const samShockKey = useMemo(() => classifySamShock(samLevels), [samLevels]);

  React.useEffect(() => {
    if (!isSam && tier) onClassified({ label: tier.label, plan: tier.plan, volume });
    if (isSam && samShockKey) onClassified({ label: samShockKey === "shock" ? "SAM \u2014 shock" : "SAM \u2014 some dehydration (ReSoMal)", plan: samShockKey === "shock" ? "Reduced-rate IV" : "ReSoMal", volume: null });
  }, [tierKey, samShockKey, isSam]); // eslint-disable-line

  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ marginBottom: 14, fontSize: 12, color: MUTED }}>{isSam ? "SAM flagged in Active Patient \u2014 using shock assessment, not standard signs." : "Using standard WHO/IMCI signs."}</div>
      {!isSam ? (
        <>
          <SectionLabel>CLINICAL SIGNS</SectionLabel>
          {SIGNS.map((s) => (<SignBlock key={s.id} sign={s} levels={levels} setLevel={setLevel} />))}
          <div style={{ marginTop: 24, background: tier ? tier.bg : SURFACE, border: `1px solid ${tier ? tier.color : BORDER}`, borderRadius: 14, padding: 20 }}>
            {!tier ? <div style={{ color: MUTED, fontSize: 14 }}>Select all four signs to classify.</div> : (
              <>
                <div style={{ fontSize: 26, fontWeight: 800, color: tier.color }}>{tier.label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: INK, marginTop: 8 }}>{tier.plan}</div>
                {tier.mlPerKg && hasWeight && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{fmt(volume)} <span style={{ fontSize: 14, fontWeight: 600, color: MUTED }}>mL total</span></div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <SectionLabel>SHOCK ASSESSMENT</SectionLabel>
          {SAM_SHOCK_SIGNS.map((s) => (<SignBlock key={s.id} sign={s} levels={samLevels} setLevel={setSamLevel} />))}
          <div style={{ marginTop: 24, background: samShockKey === "shock" ? RED_BG : AMBER_BG, border: `1px solid ${samShockKey === "shock" ? RED : AMBER}`, borderRadius: 14, padding: 20 }}>
            {!samShockKey ? <div style={{ color: MUTED, fontSize: 14 }}>Answer all four signs.</div> : samShockKey === "shock" ? (
              <>
                <div style={{ fontSize: 26, fontWeight: 800, color: RED }}>Shock present</div>
                <div style={{ fontSize: 13, color: INK, marginTop: 8, lineHeight: 1.5 }}>Ringer's lactate or half-strength Darrow's + 5% dextrose, 15 mL/kg over 1h. Reassess.</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 26, fontWeight: 800, color: AMBER }}>No shock \u2014 assume some dehydration</div>
                <div style={{ fontSize: 13, color: INK, marginTop: 8, lineHeight: 1.5 }}>ReSoMal 5 mL/kg q30min \u00d7 4, then 5\u201310 mL/kg/hr, alternating with feeds.</div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ================= Resus Mode ================= */
function ResusScreen({ patient, weight, hasWeight }) {
  const isSam = patient.isSam;
  const ageNum = parseFloat(patient.ageMonths);
  const ageYears = !Number.isNaN(ageNum) ? ageNum / 12 : null;
  const ettUncuffed = ageYears !== null ? round(ageYears >= 1 ? ageYears / 4 + 4 : 3.5, 0.5) : null;
  const ettCuffed = ageYears !== null ? round(ageYears >= 1 ? ageYears / 4 + 3.5 : 3, 0.5) : null;
  const ettDepth = ettUncuffed ? round(ettUncuffed * 3, 0.5) : null;

  const calc = hasWeight ? {
    adrenaline: round(weight * 0.01, 0.01), adrenalineMl: round(weight * 0.1, 0.1),
    amiodarone: round(Math.min(weight * 5, 300), 1), bolus: round(weight * (isSam ? 15 : 20), 1),
    shock1: round(weight * 2, 1), shockN: round(weight * 4, 1),
  } : null;

  const Row = ({ label, value, unit, sub }) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
      <div><div style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>{label}</div>{sub && <div style={{ fontSize: 11, color: MUTED, opacity: 0.8, marginTop: 2 }}>{sub}</div>}</div>
      <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 18, fontWeight: 700, color: INK, whiteSpace: "nowrap" }}>{value} <span style={{ fontSize: 12, color: MUTED, fontWeight: 500 }}>{unit}</span></div>
    </div>
  );

  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: RED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Airway</div>
        <Row label="ETT \u2014 uncuffed" value={fmt(ettUncuffed)} unit="mm ID" />
        <Row label="ETT \u2014 cuffed" value={fmt(ettCuffed)} unit="mm ID" />
        <Row label="Insertion depth" value={fmt(ettDepth)} unit="cm at lip" />
      </div>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: RED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Circulation \u2014 arrest drugs</div>
        <Row label="Adrenaline (1:10,000)" value={calc ? `${fmt(calc.adrenaline, 2)} mg / ${fmt(calc.adrenalineMl)} mL` : "\u2014"} unit="" sub="0.01 mg/kg, q3\u20135min, max 1 mg" />
        <Row label="Amiodarone" value={calc ? fmt(calc.amiodarone) : "\u2014"} unit="mg" sub="5 mg/kg, max 300 mg" />
        <Row label="Fluid bolus" value={calc ? fmt(calc.bolus) : "\u2014"} unit="mL" sub={isSam ? "15 mL/kg over 1h (SAM)" : "20 mL/kg"} />
      </div>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px" }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: RED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Defibrillation</div>
        <Row label="First shock" value={calc ? fmt(calc.shock1) : "\u2014"} unit="J" sub="2 J/kg" />
        <Row label="Subsequent shocks" value={calc ? fmt(calc.shockN) : "\u2014"} unit="J" sub="4 J/kg, max 10 J/kg" />
      </div>
      {isSam && <div style={{ marginTop: 12, fontSize: 12, color: PURPLE, fontWeight: 600, background: PURPLE_BG, borderRadius: 8, padding: "10px 12px" }}>SAM flagged \u2014 fluid bolus reduced. Watch closely for overhydration even during active resuscitation.</div>}
    </div>
  );
      }
/* ================= Disease Pathways ================= */
const PATHWAYS = [
  {
    id: "sepsis", name: "Sepsis",
    recognition: ["Fever or hypothermia", "Tachycardia, tachypnoea", "Altered mental state", "Poor perfusion \u2014 delayed cap refill, mottled skin", "\u201cLooks unwell\u201d to the assessing clinician is itself a red flag"],
    severities: [
      { id: "suspected", label: "Suspected sepsis", color: AMBER, bg: AMBER_BG, criteria: "Possible infection source + 1\u20132 mild features, no clear organ dysfunction.",
        steps: ["Senior review", "Blood cultures and lactate before antibiotics if possible, but don't delay antibiotics to get them", "Start empirical IV antibiotics within 1 hour", "Monitor vitals closely"],
        links: ["Vitals & PEWS", "Dosing \u2014 antibiotic dose"] },
      { id: "sepsis", label: "Sepsis", color: RED, bg: RED_BG, criteria: "Suspected/confirmed infection + organ dysfunction (altered mental state, prolonged cap refill, reduced urine output, tachypnoea/hypoxia, tachycardia).",
        steps: ["Everything in \u201csuspected\u201d, escalated in urgency", "Fluid bolus 10\u201320 mL/kg (15 mL/kg over 1h if SAM)", "Reassess after each bolus", "Consider HDU/ICU-level monitoring"],
        links: ["Dosing & Fluids \u2014 bolus (SAM-aware)", "Safety Guard \u2014 sepsis pattern"] },
      { id: "shock", label: "Septic shock", color: RED, bg: RED_BG, criteria: "Sepsis + perfusion abnormality or hypotension not resolving with initial fluids.",
        steps: ["Urgent senior / ICU involvement", "Repeated fluid boluses with reassessment between each", "Vasoactive drugs per local protocol if fluid-refractory", "Continuous monitoring"],
        links: ["Resus Mode", "Safety Guard \u2014 shock / pre-arrest"] },
    ],
    redFlags: ["No improvement after initial fluid boluses", "Rising lactate", "New/worsening altered consciousness", "Mottled or cyanosed skin", "Apnoea"],
  },
  {
    id: "gastro", name: "Gastroenteritis",
    recognition: ["Diarrhoea \u00b1 vomiting", "Hydration status is the first priority to assess"],
    severities: [
      { id: "none", label: "No dehydration", color: GREEN, bg: GREEN_BG, criteria: "Matches \u201cNo dehydration\u201d in the Dehydration module.",
        steps: ["Continue usual feeding", "Extra fluids after each loose stool", "Zinc supplementation per WHO schedule", "Safety-net advice"], links: ["Dehydration screen"] },
      { id: "some", label: "Some dehydration", color: AMBER, bg: AMBER_BG, criteria: "Matches \u201cSome dehydration\u201d \u2014 or SAM ReSoMal pathway if malnourished.",
        steps: ["ORS 75 mL/kg over 4h (or SAM ReSoMal if malnourished)", "Reassess at 4 hours", "Continue feeding alongside rehydration"], links: ["Dehydration screen \u2014 Plan B / SAM"] },
      { id: "severe", label: "Severe dehydration", color: RED, bg: RED_BG, criteria: "Matches \u201cSevere dehydration\u201d \u2014 or SAM shock pathway if malnourished.",
        steps: ["IV fluids urgently per Plan C (or reduced-rate SAM shock regimen)", "If IV access delayed, consider NG tube ORS and refer urgently"], links: ["Dehydration screen \u2014 Plan C / SAM shock", "Resus Mode"] },
    ],
    redFlags: ["Persistent vomiting preventing oral/NG rehydration", "Bloody diarrhoea", "High fever or seizures", "No improvement after rehydration", "Any sign of shock"],
  },
  {
    id: "pneumonia", name: "Pneumonia",
    recognition: ["Cough and/or difficulty breathing", "Fever", "WHO/IMCI classifies mainly on RR and chest indrawing \u2014 auscultation not required"],
    severities: [
      { id: "no-pneumonia", label: "No pneumonia (cough/cold)", color: GREEN, bg: GREEN_BG, criteria: "No fast breathing for age, no chest indrawing.",
        steps: ["Home care", "Safety-net advice"], links: [] },
      { id: "pneumonia", label: "Pneumonia (fast breathing only)", color: AMBER, bg: AMBER_BG, criteria: "RR above age cutoff (<2mo \u2265 60, 2\u201312mo \u2265 50, 1\u20135y \u2265 40), no chest indrawing/danger signs.",
        steps: ["Oral amoxicillin, weight-based", "Home care if follow-up reliable", "Review in 2\u20133 days"], links: ["Dosing \u2014 amoxicillin", "Vitals & PEWS \u2014 RR"] },
      { id: "severe", label: "Severe pneumonia", color: RED, bg: RED_BG, criteria: "Chest indrawing, any danger sign (unable to drink, vomiting everything, convulsions, lethargic/unconscious), or stridor in a calm child.",
        steps: ["Admit", "IV/IM antibiotics per local protocol", "Oxygen if SpO2 < 90%", "Monitor closely"], links: ["Dosing \u2014 IV antibiotics", "Vitals & PEWS", "Safety Guard \u2014 resp failure"] },
    ],
    redFlags: ["Any general danger sign present", "SpO2 persistently low despite oxygen", "Not improving after 48h antibiotics", "Signs of complication"],
  },
  {
    id: "dka", name: "DKA",
    recognition: ["Known or new diabetes", "Polyuria, polydipsia, weight loss", "Vomiting, abdominal pain", "Kussmaul breathing, fruity breath odour", "Altered consciousness in severe cases"],
    severities: [
      { id: "mild", label: "Mild", color: AMBER, bg: AMBER_BG, criteria: "Clinically well and alert, tolerating oral fluids, mild dehydration signs.",
        steps: ["Encourage oral fluids", "Subcutaneous insulin per protocol", "Monitor glucose and ketones", "Admit for observation"], links: ["Vitals & PEWS"] },
      { id: "moderate", label: "Moderate", color: RED, bg: RED_BG, criteria: "Clinical dehydration, tachypnoea/Kussmaul breathing, vomiting, drowsy but rousable.",
        steps: ["IV fluids started cautiously and gradually \u2014 do NOT use standard rapid Plan C rate", "IV insulin infusion 0.05\u20130.1 units/kg/hr \u2014 no bolus", "Hourly neuro observations"], links: ["Vitals & PEWS \u2014 neuro monitoring"] },
      { id: "severe", label: "Severe", color: RED, bg: RED_BG, criteria: "Reduced/unconscious, signs of shock, severe Kussmaul breathing.",
        steps: ["Senior / ICU involvement immediately", "Extremely cautious, gradual fluid replacement over ~48h", "Insulin infusion, no bolus", "Watch for cerebral oedema: headache, irritability, bradycardia+hypertension, falling consciousness"], links: ["Resus Mode", "Safety Guard \u2014 DKA pattern"] },
    ],
    redFlags: ["Any headache, irritability, or falling consciousness during treatment \u2014 think cerebral oedema", "Persistent hemodynamic instability"],
    caution: "DKA fluid management is deliberately different from the Dehydration module. A standard severe-dehydration rapid IV rate raises cerebral oedema risk \u2014 use the gradual DKA-specific regimen instead.",
  },
];

function PathwaysScreen() {
  const [pathwayId, setPathwayId] = useState(PATHWAYS[0].id);
  const [severityId, setSeverityId] = useState(null);
  const pathway = PATHWAYS.find((p) => p.id === pathwayId);
  const severity = pathway.severities.find((s) => s.id === severityId) || null;
  const selectPathway = (id) => { setPathwayId(id); setSeverityId(null); };

  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
        {PATHWAYS.map((p) => (
          <button key={p.id} onClick={() => selectPathway(p.id)}
            style={{ whiteSpace: "nowrap", padding: "9px 16px", borderRadius: 20, border: `1px solid ${pathwayId === p.id ? TEAL : BORDER}`, background: pathwayId === p.id ? TEAL : SURFACE, color: pathwayId === p.id ? "#fff" : INK, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {p.name}
          </button>
        ))}
      </div>

      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>Recognition</div>
        <ul style={{ margin: 0, paddingLeft: 18 }}>
          {pathway.recognition.map((r, i) => (<li key={i} style={{ fontSize: 13, color: INK, marginBottom: 4, lineHeight: 1.5 }}>{r}</li>))}
        </ul>
      </div>

      {pathway.caution && (
        <div style={{ marginTop: 12, background: RED_BG, border: `1px solid ${RED}`, borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: RED, marginBottom: 4 }}>Important</div>
          <div style={{ fontSize: 13, color: INK, lineHeight: 1.5 }}>{pathway.caution}</div>
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <SectionLabel>SEVERITY</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {pathway.severities.map((s) => {
            const active = severityId === s.id;
            return (
              <button key={s.id} onClick={() => setSeverityId(s.id)}
                style={{ textAlign: "left", padding: "12px 14px", borderRadius: 10, border: `1px solid ${active ? s.color : BORDER}`, background: active ? s.bg : SURFACE, cursor: "pointer" }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: active ? s.color : INK }}>{s.label}</div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 3, lineHeight: 1.4 }}>{s.criteria}</div>
              </button>
            );
          })}
        </div>
      </div>

      {severity && (
        <div style={{ marginTop: 20, background: severity.bg, border: `1px solid ${severity.color}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: severity.color, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>Management \u2014 {severity.label}</div>
          <ol style={{ margin: 0, paddingLeft: 18 }}>
            {severity.steps.map((step, i) => (<li key={i} style={{ fontSize: 13, color: INK, marginBottom: 8, lineHeight: 1.5 }}>{step}</li>))}
          </ol>
          {severity.links.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {severity.links.map((link, i) => (<span key={i} style={{ fontSize: 11, fontWeight: 700, color: BLUE, background: BLUE_BG, borderRadius: 6, padding: "4px 9px" }}>\u2192 {link}</span>))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: RED, marginBottom: 8 }}>ESCALATE IF</div>
        <div style={{ background: RED_BG, border: `1px solid ${RED}`, borderRadius: 12, padding: 16 }}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {pathway.redFlags.map((f, i) => (<li key={i} style={{ fontSize: 13, color: INK, marginBottom: 6, lineHeight: 1.5 }}>{f}</li>))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ================= Summary Screen ================= */
function SummaryScreen({ patient, weight, hasWeight, pewsResult, dehydrationResult, savedDose }) {
  const [copied, setCopied] = useState(false);
  const band = patient.ageMonths ? bandForAge(parseFloat(patient.ageMonths)) : null;

  const text = useMemo(() => {
    const lines = [];
    lines.push("PEDIATRIC HANDOFF SUMMARY");
    lines.push(`Age: ${patient.ageMonths || "\u2014"} months${band ? ` (${band.label})` : ""} | Weight: ${hasWeight ? fmt(weight) + " kg" : "\u2014"} | SAM: ${patient.isSam ? "Yes" : "No"}`);
    lines.push("");
    if (pewsResult) {
      lines.push(`PEWS: ${pewsResult.total}/9 \u2014 ${pewsResult.tier} risk${!pewsResult.complete ? " (partial data)" : ""}`);
      lines.push(pewsResult.triggeredPatterns.length ? `Safety Guard: ${pewsResult.triggeredPatterns.join(", ")}` : "Safety Guard: no high-risk patterns flagged");
    } else {
      lines.push("PEWS: not assessed");
    }
    lines.push("");
    lines.push(dehydrationResult ? `Dehydration: ${dehydrationResult.label} \u2014 ${dehydrationResult.plan}${dehydrationResult.volume ? ` (${fmt(dehydrationResult.volume)} mL)` : ""}` : "Dehydration: not assessed");
    lines.push("");
    lines.push(savedDose ? `Last calculated dose: ${savedDose.name} \u2014 ${fmt(savedDose.mg)} mg${savedDose.mL ? ` (${fmt(savedDose.mL)} mL)` : ""}` : "Last calculated dose: none saved");
    lines.push("");
    lines.push("Generated by Pediatric Mode \u2014 verify all values before acting; not a substitute for clinical documentation.");
    return lines.join("\n");
  }, [patient, weight, hasWeight, band, pewsResult, dehydrationResult, savedDose]);

  const copy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
    }
  };

  return (
    <div style={{ padding: "16px 20px" }}>
      <SectionLabel>SHIFT HANDOFF SUMMARY</SectionLabel>
      <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "ui-monospace, monospace", fontSize: 13, color: INK, margin: 0, lineHeight: 1.6 }}>{text}</pre>
      </div>
      <button onClick={copy} style={{ marginTop: 14, width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: TEAL, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
        {copied ? "Copied \u2713" : "Copy summary"}
      </button>
      <div style={{ marginTop: 10, fontSize: 12, color: MUTED }}>Assessments update this automatically as you use other modules \u2014 come back here any time before handing off.</div>
    </div>
  );
}

/* ================= App shell ================= */
const MODULES = [
  { id: "dosing", label: "Dosing" },
  { id: "vitals", label: "Vitals & PEWS" },
  { id: "dehydration", label: "Dehydration" },
  { id: "resus", label: "Resus" },
  { id: "pathways", label: "Pathways" },
  { id: "summary", label: "Summary" },
];

export default function PediatricModeApp() {
  const [screen, setScreen] = useState("dosing");
  const [patient, setPatient] = useState({ ageMonths: "", weightKg: "", isSam: false });
  const [vitals, setVitals] = useState({ hr: "", rr: "", spo2: "", temp: "", behavior: null, respEffort: null, capRefill: null, suspectedDiabetes: false });
  const [pewsResult, setPewsResult] = useState(null);
  const [dehydrationResult, setDehydrationResult] = useState(null);
  const [savedDose, setSavedDose] = useState(null);

  const ageNum = parseFloat(patient.ageMonths);
  const hasAge = !Number.isNaN(ageNum) && ageNum > 0;
  const band = hasAge ? bandForAge(ageNum) : null;
  const estWeight = hasAge ? estimateWeight(ageNum / 12) : null;
  const manualWeight = parseFloat(patient.weightKg);
  const hasManualWeight = !Number.isNaN(manualWeight) && manualWeight > 0;
  const weight = hasManualWeight ? manualWeight : estWeight;
  const hasWeight = !!weight;

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: INK }}>
      <div style={{ maxWidth: 480, margin: "0 auto", paddingBottom: 40 }}>
        <div style={{ padding: "16px 20px 0" }}>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", color: TEAL, textTransform: "uppercase" }}>Pediatric Mode</div>
        </div>

        <PatientBar patient={patient} setPatient={setPatient} />

        <div style={{ display: "flex", gap: 8, padding: "12px 20px 4px", overflowX: "auto" }}>
          {MODULES.map((m) => (
            <button key={m.id} onClick={() => setScreen(m.id)}
              style={{ whiteSpace: "nowrap", padding: "9px 16px", borderRadius: 20, border: `1px solid ${screen === m.id ? TEAL : BORDER}`, background: screen === m.id ? TEAL : SURFACE, color: screen === m.id ? "#fff" : INK, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
              {m.label}
            </button>
          ))}
        </div>

        {screen === "dosing" && <DosingScreen patient={patient} weight={weight} hasWeight={hasWeight} onDoseCalculated={setSavedDose} />}
        {screen === "vitals" && <VitalsScreen patient={patient} band={band} hasAge={hasAge} vitals={vitals} setVitals={setVitals} onPewsCalculated={setPewsResult} />}
        {screen === "dehydration" && <DehydrationScreen patient={patient} weight={weight} hasWeight={hasWeight} onClassified={setDehydrationResult} />}
        {screen === "resus" && <ResusScreen patient={patient} weight={weight} hasWeight={hasWeight} />}
        {screen === "pathways" && <PathwaysScreen />}
        {screen === "summary" && <SummaryScreen patient={patient} weight={weight} hasWeight={hasWeight} pewsResult={pewsResult} dehydrationResult={dehydrationResult} savedDose={savedDose} />}

        <div style={{ margin: "12px 20px 0", padding: "12px 14px", borderRadius: 10, background: "#EFF3F2", fontSize: 12, color: MUTED, lineHeight: 1.5 }}>
          Works fully offline once loaded \u2014 no network calls. Decision support only; verify against local protocol before acting.
        </div>
      </div>
    </div>
  );
       }
