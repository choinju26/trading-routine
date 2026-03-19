import { useState, useEffect, useRef } from "react";

const CHECKLIST_ITEMS = [
  { id: "mss5", label: "5분봉 MSS 발생" },
  { id: "mss15", label: "15분봉 MSS 발생" },
  { id: "div1h", label: "1시간봉 다이버전스 생성" },
  { id: "sweep4h", label: "4시간봉 유동성 스윕" },
  { id: "liqsweep", label: "Liquidity Sweep" },
  { id: "div", label: "다이버전스 생성" },
  { id: "ob", label: "OB 터치" },
  { id: "fvg", label: "FVG 터치" },
  { id: "srflip", label: "SR Flip - FRVP" },
];

const RULE_VIOLATIONS = [
  { id: "oversize", label: "과도한 포지션 사이즈" },
  { id: "revenge", label: "복수 매매" },
  { id: "plan_dev", label: "플랜 이탈 매매" },
  { id: "daily_loss", label: "일일 손실 한도 초과" },
  { id: "fomo", label: "FOMO 진입" },
  { id: "early_exit", label: "조기 청산 (공포로 인한)" },
];


const EMOTIONS = ["😤 집중", "😊 좋음", "😐 보통", "😟 불안", "😡 흥분"];

const formatDate = (d) => {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${days[d.getDay()]})`;
};

const getTodayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const EMPTY_LOG = () => ({
  checklist: {},
  violations: {},
  asset: "",
  leverage: "14",
  direction: "",
  pnlType: "profit",
  entry: "",
  exit: "",
  pnl: "",
  emotion: "",
  note: "",
  dailyBias: "",
  biasNote: "",
  saved: false,
});

function BalanceChart({ data, startCapital, green, danger, border, sub }) {
  if (!data || data.length < 2) return null;
  const W = 440, H = 160, PAD = { top: 16, right: 16, bottom: 28, left: 60 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const balances = data.map((d) => d.balance);
  const allVals = [startCapital, ...balances];
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const range = maxVal - minVal || 1;
  const xScale = (i) => PAD.left + (i / data.length) * innerW;
  const yScale = (v) => PAD.top + innerH - ((v - minVal) / range) * innerH;
  const points = data.map((d, i) => `${xScale(i + 0.5)},${yScale(d.balance)}`);
  const startX = PAD.left;
  const startY = yScale(startCapital);
  const linePath = `M${startX},${startY} ` + points.map((p) => `L${p}`).join(" ");
  const lastX = xScale(data.length - 0.5);
  const lastY = yScale(data[data.length - 1].balance);
  const areaPath = `${linePath} L${lastX},${PAD.top + innerH} L${startX},${PAD.top + innerH} Z`;
  const finalBalance = balances[balances.length - 1];
  const lineColor = finalBalance >= startCapital ? green : danger;
  const yLabels = [minVal, (minVal + maxVal) / 2, maxVal].map((v) => ({
    val: v, y: yScale(v),
    label: v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : v.toFixed(0),
  }));
  const step = Math.max(1, Math.floor(data.length / 4));
  const xLabels = data
    .filter((_, i) => i % step === 0 || i === data.length - 1)
    .map((d) => ({ label: d.key.split("-").slice(1).join("/"), x: xScale(data.indexOf(d) + 0.5) }));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {yLabels.map((l, i) => (
        <line key={i} x1={PAD.left} x2={W - PAD.right} y1={l.y} y2={l.y} stroke={border} strokeWidth="1" strokeDasharray="3,4" />
      ))}
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={startX} cy={startY} r="3" fill={sub} />
      <circle cx={lastX} cy={lastY} r="4" fill={lineColor} />
      {yLabels.map((l, i) => (
        <text key={i} x={PAD.left - 6} y={l.y + 4} textAnchor="end" fontSize="9" fill={sub} fontFamily="'IBM Plex Mono', monospace">{l.label}</text>
      ))}
      {xLabels.map((l, i) => (
        <text key={i} x={l.x} y={H - 4} textAnchor="middle" fontSize="9" fill={sub} fontFamily="'IBM Plex Mono', monospace">{l.label}</text>
      ))}
    </svg>
  );
}

export default function App() {
  const [tab, setTab] = useState("check");
  const [todayKey] = useState(getTodayKey());
  const [log, setLog] = useState(EMPTY_LOG());
  const [history, setHistory] = useState({});
  const [saveAnim, setSaveAnim] = useState(false);
  const [biasEditing, setBiasEditing] = useState(false);
  const [startCapital, setStartCapital] = useState("");
  const [editingCapital, setEditingCapital] = useState(false);
  const [capitalInput, setCapitalInput] = useState("");
  const [editingKey, setEditingKey] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("tradeHistory") || "{}");
      setHistory(stored);
      if (stored[todayKey]) setLog(stored[todayKey]);
      const cap = localStorage.getItem("startCapital");
      if (cap) setStartCapital(cap);
    } catch {}
  }, []);

  const updateHistory = (newLog) => {
    const updated = { ...history, [todayKey]: newLog };
    setHistory(updated);
    try { localStorage.setItem("tradeHistory", JSON.stringify(updated)); } catch {}
  };

  const toggleCheck = (id) => {
    const newLog = { ...log, checklist: { ...log.checklist, [id]: !log.checklist[id] } };
    setLog(newLog); updateHistory(newLog);
  };

  const toggleViolation = (id) => {
    const newLog = { ...log, violations: { ...log.violations, [id]: !log.violations[id] } };
    setLog(newLog); updateHistory(newLog);
  };

  const setField = (key, val) => {
    const newLog = { ...log, [key]: val };
    setLog(newLog); updateHistory(newLog);
  };

  const handleSave = () => {
    const signedPnl = String(Math.abs(parseFloat(log.pnl) || 0) * (log.pnlType === "loss" ? -1 : 1));
    const newLog = { ...log, pnl: signedPnl, saved: true };
    updateHistory(newLog);
    setSaveAnim(true);
    setTimeout(() => {
      setSaveAnim(false);
      // 저장 후 텍스트 입력칸만 초기화 (저장된 데이터는 유지, 체크리스트도 유지)
      setLog({
        ...newLog,
        asset: "",
        leverage: "14",
        direction: "",
        entry: "",
        exit: "",
        pnl: "",
        pnlType: "profit",
        emotion: "",
        note: "",
      });
    }, 1200);
  };

  const handleDeleteEntry = (key) => {
    const updated = { ...history };
    delete updated[key];
    setHistory(updated);
    setDeleteConfirm(null);
    try { localStorage.setItem("tradeHistory", JSON.stringify(updated)); } catch {}
  };

  const handleEditEntry = (key) => {
    setEditDraft({ ...history[key] });
    setEditingKey(key);
  };

  const handleSaveEdit = () => {
    const updated = { ...history, [editingKey]: { ...editDraft, saved: true } };
    setHistory(updated);
    setEditingKey(null);
    setEditDraft(null);
    try { localStorage.setItem("tradeHistory", JSON.stringify(updated)); } catch {}
  };

  const saveCapital = () => {
    const val = capitalInput.replace(/,/g, "");
    if (!isNaN(val) && val !== "") {
      setStartCapital(val);
      localStorage.setItem("startCapital", val);
    }
    setEditingCapital(false);
    setCapitalInput("");
  };

  const checkedCount = CHECKLIST_ITEMS.filter((i) => log.checklist[i.id]).length;
  const checkPct = Math.round((checkedCount / CHECKLIST_ITEMS.length) * 100);
  const violationCount = RULE_VIOLATIONS.filter((i) => log.violations[i.id]).length;
  const pnlNum = (parseFloat(log.pnl) || 0) * (log.pnlType === "loss" ? -1 : 1);
  const historyDays = Object.entries(history).sort(([a], [b]) => (a < b ? 1 : -1)).slice(0, 30);

  const cap = parseFloat(startCapital) || 0;
  const sortedAll = Object.entries(history).filter(([, d]) => d.pnl !== "").sort(([a], [b]) => (a < b ? -1 : 1));
  let running = cap;
  const balanceMap = {};
  sortedAll.forEach(([key, d]) => {
    const prev = running;
    running += parseFloat(d.pnl) || 0;
    balanceMap[key] = { prev, balance: running };
  });
  const chartData = sortedAll.filter(([, d]) => d.saved).map(([key]) => ({ key, balance: balanceMap[key]?.balance || cap }));

  const allDays = Object.values(history);
  const totalPnl = allDays.reduce((s, d) => s + (parseFloat(d.pnl) || 0), 0);
  const winDays = allDays.filter((d) => (parseFloat(d.pnl) || 0) > 0).length;
  const tradeDays = allDays.filter((d) => d.pnl !== "").length;
  const winRate = tradeDays > 0 ? Math.round((winDays / tradeDays) * 100) : 0;
  const currentBalance = cap + totalPnl;
  const totalViolations = allDays.reduce((s, d) => s + Object.values(d.violations || {}).filter(Boolean).length, 0);

  const accent = "#00E5FF", danger = "#FF3D5A", gold = "#FFD166", green = "#06D6A0";
  const bg = "#0A0C0F", card = "#13171C", border = "#2A323D", muted = "#7A8899", text = "#F1F5F9", sub = "#B0BBC8";

  const s = {
    app: { minHeight: "100vh", background: bg, color: text, fontFamily: "'IBM Plex Mono','Courier New',monospace", maxWidth: 480, margin: "0 auto", paddingBottom: 80 },
    header: { padding: "20px 20px 0", borderBottom: `1px solid ${border}` },
    headerTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
    title: { fontSize: 11, letterSpacing: "0.2em", color: accent, textTransform: "uppercase", marginBottom: 2 },
    date: { fontSize: 18, fontWeight: 700, color: text, letterSpacing: "-0.02em" },
    scoreNum: { fontSize: 28, fontWeight: 700, color: checkPct === 100 ? green : checkPct >= 75 ? gold : accent, lineHeight: 1 },
    scoreLabel: { fontSize: 10, color: sub, letterSpacing: "0.12em", textTransform: "uppercase" },
    progressBar: { height: 3, background: border, margin: "12px 0 0", overflow: "hidden" },
    progressFill: { height: "100%", width: `${checkPct}%`, background: checkPct === 100 ? green : accent, transition: "width 0.4s ease" },
    tabs: { display: "flex", borderBottom: `1px solid ${border}`, background: card },
    tab: (a) => ({ flex: 1, padding: "14px 8px", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", border: "none", background: "none", cursor: "pointer", color: a ? accent : muted, borderBottom: a ? `2px solid ${accent}` : "2px solid transparent", transition: "all 0.2s", fontFamily: "inherit" }),
    content: { padding: "16px 16px 0" },
    section: { marginBottom: 20 },
    secTitle: { fontSize: 10, letterSpacing: "0.18em", color: accent, textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 },
    secLine: { flex: 1, height: 1, background: border },
    checkItem: (c) => ({ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 4, background: c ? "rgba(0,229,255,0.04)" : card, border: `1px solid ${c ? "rgba(0,229,255,0.2)" : border}`, borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }),
    checkbox: (c) => ({ width: 18, height: 18, border: `1.5px solid ${c ? accent : muted}`, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: c ? accent : "transparent", transition: "all 0.2s" }),
    chkLabel: (c) => ({ fontSize: 13, color: c ? text : sub, lineHeight: 1.5, fontWeight: c ? 500 : 400 }),
    vioItem: (c) => ({ display: "flex", alignItems: "center", gap: 12, padding: "11px 14px", marginBottom: 4, background: c ? "rgba(255,61,90,0.07)" : card, border: `1px solid ${c ? "rgba(255,61,90,0.35)" : border}`, borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }),
    vBox: (c) => ({ width: 18, height: 18, border: `1.5px solid ${c ? danger : muted}`, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: c ? danger : "transparent", transition: "all 0.2s" }),
    field: { width: "100%", background: card, border: `1px solid ${border}`, borderRadius: 8, padding: "11px 14px", color: text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box", caretColor: accent },
    fieldLbl: { fontSize: 10, color: sub, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 7, fontWeight: 600 },
    row: { display: "flex", gap: 10, marginBottom: 10 },
    col: { flex: 1 },
    btnRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 },
    pill: (a, c = accent) => ({ padding: "7px 14px", borderRadius: 20, fontSize: 11, border: `1px solid ${a ? c : border}`, background: a ? `${c}18` : "transparent", color: a ? c : sub, cursor: "pointer", fontFamily: "inherit", transition: "all 0.2s" }),
    pnlInput: { width: "100%", background: card, border: `1px solid ${pnlNum > 0 ? "rgba(6,214,160,0.4)" : pnlNum < 0 ? "rgba(255,61,90,0.4)" : border}`, borderRadius: 8, padding: "11px 14px", color: pnlNum > 0 ? green : pnlNum < 0 ? danger : text, fontSize: 16, fontWeight: 700, fontFamily: "inherit", outline: "none", boxSizing: "border-box", textAlign: "right" },
    saveBtn: { width: "100%", padding: "15px", borderRadius: 10, border: "none", background: saveAnim ? green : `linear-gradient(135deg,${accent},#0099B4)`, color: "#000", fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", transition: "all 0.3s", marginTop: 8 },
    histCard: (p) => ({ padding: "14px", marginBottom: 8, background: card, border: `1px solid ${border}`, borderRadius: 10, borderLeft: `3px solid ${p > 0 ? green : p < 0 ? danger : muted}` }),
    histDate: { fontSize: 10, color: sub, marginBottom: 6 },
    histRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
    histPnl: (p) => ({ fontSize: 18, fontWeight: 700, color: p > 0 ? green : p < 0 ? danger : muted }),
    histMeta: { fontSize: 10, color: sub, textAlign: "right" },
    histNote: { fontSize: 11, color: sub, marginTop: 6, lineHeight: 1.5 },
    emptyHist: { textAlign: "center", color: muted, fontSize: 12, padding: "40px 0" },
    statRow: { display: "flex", gap: 8, marginBottom: 12 },
    statCard: { flex: 1, background: card, border: `1px solid ${border}`, borderRadius: 10, padding: "14px 12px", textAlign: "center" },
    statVal: (c) => ({ fontSize: 18, fontWeight: 700, color: c || text }),
    statLbl: { fontSize: 10, color: sub, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 },
    navBar: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: card, borderTop: `1px solid ${border}`, display: "flex" },
    navBtn: (a) => ({ flex: 1, padding: "14px 8px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, border: "none", background: "none", cursor: "pointer", color: a ? accent : muted, fontFamily: "inherit", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", transition: "color 0.2s" }),
  };

  return (
    <div style={s.app}>
      <div style={s.header}>
        <div style={s.headerTop}>
          <div>
            <div style={s.title}>Trading Routine</div>
            <div style={s.date}>{formatDate(new Date())}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={s.scoreNum}>{checkPct}%</div>
            <div style={s.scoreLabel}>Ready</div>
          </div>
        </div>
        <div style={s.progressBar}><div style={s.progressFill} /></div>
        <div style={s.tabs}>
          {[["check", "체크리스트"], ["journal", "매매일지"], ["history", "히스토리"]].map(([k, l]) => (
            <button key={k} style={s.tab(tab === k)} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>

      {tab === "check" && (
        <div style={s.content}>

          {/* DAILY BIAS */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", color: sub, textTransform: "uppercase", marginBottom: 10 }}>Daily Bias</div>
            {!biasEditing && !log.dailyBias ? (
              <div
                onClick={() => setBiasEditing(true)}
                style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "28px 16px", background: card, border: `2px dashed ${border}`, borderRadius: 14, cursor: "pointer" }}
              >
                <span style={{ fontSize: 13, color: muted, letterSpacing: "0.05em" }}>+ 오늘의 바이어스 입력</span>
              </div>
            ) : biasEditing ? (
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {["BULLISH 📈", "BEARISH 📉", "NEUTRAL ➡️"].map((b) => {
                    const key = b.split(" ")[0];
                    const isB = log.dailyBias === key;
                    const col = key === "BULLISH" ? green : key === "BEARISH" ? danger : gold;
                    return (
                      <button key={key}
                        onClick={() => setField("dailyBias", key)}
                        style={{ flex: 1, padding: "10px 4px", borderRadius: 10, border: `1.5px solid ${isB ? col : border}`, background: isB ? `${col}18` : "transparent", color: isB ? col : sub, fontFamily: "inherit", fontSize: 11, fontWeight: isB ? 700 : 400, cursor: "pointer", transition: "all 0.2s" }}>
                        {b}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  style={{ ...s.field, minHeight: 72, resize: "none", lineHeight: 1.6, fontSize: 12, marginBottom: 10 }}
                  placeholder="바이어스 근거 메모 (지지/저항, 추세, 뉴스 등)"
                  value={log.biasNote}
                  onChange={(e) => setField("biasNote", e.target.value)}
                />
                <button onClick={() => setBiasEditing(false)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: accent, color: "#000", fontWeight: 700, fontFamily: "inherit", fontSize: 11, cursor: "pointer", letterSpacing: "0.1em" }}>
                  확인
                </button>
              </div>
            ) : (
              <div
                onClick={() => setBiasEditing(true)}
                style={{
                  background: log.dailyBias === "BULLISH" ? "rgba(6,214,160,0.07)" : log.dailyBias === "BEARISH" ? "rgba(255,61,90,0.07)" : "rgba(255,209,102,0.07)",
                  border: `1.5px solid ${log.dailyBias === "BULLISH" ? "rgba(6,214,160,0.3)" : log.dailyBias === "BEARISH" ? "rgba(255,61,90,0.3)" : "rgba(255,209,102,0.3)"}`,
                  borderRadius: 14, padding: "18px 20px", cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: log.biasNote ? 10 : 0 }}>
                  <div style={{
                    fontSize: 28, fontWeight: 900, letterSpacing: "0.05em",
                    color: log.dailyBias === "BULLISH" ? green : log.dailyBias === "BEARISH" ? danger : gold
                  }}>
                    {log.dailyBias === "BULLISH" ? "📈 BULLISH" : log.dailyBias === "BEARISH" ? "📉 BEARISH" : "➡️ NEUTRAL"}
                  </div>
                  <span style={{ fontSize: 10, color: sub, letterSpacing: "0.1em" }}>수정 ✎</span>
                </div>
                {log.biasNote && <div style={{ fontSize: 12, color: sub, lineHeight: 1.6 }}>{log.biasNote}</div>}
              </div>
            )}
          </div>

          <div style={s.section}>
            <div style={s.secTitle}>
              <span>매매 전 루틴</span><div style={s.secLine} />
              <span style={{ color: sub, fontSize: 10 }}>{checkedCount}/{CHECKLIST_ITEMS.length}</span>
            </div>
            {CHECKLIST_ITEMS.map((item) => (
              <div key={item.id} style={s.checkItem(!!log.checklist[item.id])} onClick={() => toggleCheck(item.id)}>
                <div style={s.checkbox(!!log.checklist[item.id])}>
                  {log.checklist[item.id] && <span style={{ fontSize: 11, color: "#000", fontWeight: 900 }}>✓</span>}
                </div>
                <span style={s.chkLabel(!!log.checklist[item.id])}>{item.label}</span>
              </div>
            ))}
          </div>
          <div style={s.section}>
            <div style={s.secTitle}>
              <span style={{ color: danger }}>규칙 위반 체크</span>
              <div style={{ ...s.secLine, background: "rgba(255,61,90,0.2)" }} />
              {violationCount > 0 && <span style={{ color: danger, fontSize: 10 }}>{violationCount}건</span>}
            </div>
            {RULE_VIOLATIONS.map((item) => (
              <div key={item.id} style={s.vioItem(!!log.violations[item.id])} onClick={() => toggleViolation(item.id)}>
                <div style={s.vBox(!!log.violations[item.id])}>
                  {log.violations[item.id] && <span style={{ fontSize: 11, color: "#fff", fontWeight: 900 }}>!</span>}
                </div>
                <span style={{ ...s.chkLabel(true), color: log.violations[item.id] ? danger : sub }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "journal" && (
        <div style={s.content}>
          <div style={s.section}>
            <div style={s.secTitle}><span>거래 정보</span><div style={s.secLine} /></div>
            <div style={{ marginBottom: 10 }}>
              <div style={s.fieldLbl}>레버리지</div>
              <div style={{ display: "inline-block", padding: "8px 20px", borderRadius: 8, border: `1px solid ${gold}`, background: `${gold}18`, color: gold, fontWeight: 700, fontSize: 14, marginBottom: 10 }}>
                14x
              </div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={s.fieldLbl}>방향</div>
              <div style={s.btnRow}>{["LONG", "SHORT"].map((d) => (
                <button key={d} style={s.pill(log.direction === d, d === "SHORT" ? danger : green)} onClick={() => setField("direction", d)}>{d}</button>
              ))}</div>
            </div>
            <div style={s.row}>
              <div style={s.col}><div style={s.fieldLbl}>진입가</div><input style={s.field} placeholder="0.00" value={log.entry} onChange={(e) => setField("entry", e.target.value)} type="number" /></div>
              <div style={s.col}><div style={s.fieldLbl}>청산가</div><input style={s.field} placeholder="0.00" value={log.exit} onChange={(e) => setField("exit", e.target.value)} type="number" /></div>
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={s.fieldLbl}>수익 / 손실</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button
                  onClick={() => setField("pnlType", "profit")}
                  style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1.5px solid ${log.pnlType !== "loss" ? "rgba(6,214,160,0.6)" : border}`, background: log.pnlType !== "loss" ? "rgba(6,214,160,0.1)" : "transparent", color: log.pnlType !== "loss" ? green : sub, fontWeight: 700, fontFamily: "inherit", fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>
                  📈 수익
                </button>
                <button
                  onClick={() => setField("pnlType", "loss")}
                  style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1.5px solid ${log.pnlType === "loss" ? "rgba(255,61,90,0.6)" : border}`, background: log.pnlType === "loss" ? "rgba(255,61,90,0.1)" : "transparent", color: log.pnlType === "loss" ? danger : sub, fontWeight: 700, fontFamily: "inherit", fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>
                  📉 손실
                </button>
              </div>
              <input
                style={{ ...s.pnlInput, borderColor: log.pnlType === "loss" ? "rgba(255,61,90,0.4)" : "rgba(6,214,160,0.4)", color: log.pnlType === "loss" ? danger : green }}
                placeholder="0.00 USDT"
                value={log.pnl}
                onChange={(e) => setField("pnl", e.target.value)}
                type="number"
              />
            </div>
          </div>
          <div style={s.section}>
            <div style={s.secTitle}><span>심리 & 회고</span><div style={s.secLine} /></div>
            <div style={{ marginBottom: 10 }}>
              <div style={s.fieldLbl}>매매 당시 심리</div>
              <div style={s.btnRow}>{EMOTIONS.map((e) => <button key={e} style={{ ...s.pill(log.emotion === e, gold), fontSize: 12 }} onClick={() => setField("emotion", e)}>{e}</button>)}</div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div style={s.fieldLbl}>매매 일지</div>
              <textarea style={{ ...s.field, minHeight: 120, resize: "vertical", lineHeight: 1.6 }}
                placeholder={"시나리오대로 진행됐나?\n잘된 점 / 개선할 점\n다음에 적용할 교훈"}
                value={log.note} onChange={(e) => setField("note", e.target.value)} />
            </div>
            <button style={s.saveBtn} onClick={handleSave}>{saveAnim ? "✓ 저장 완료" : "오늘 일지 저장"}</button>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div style={s.content}>
          {/* 보유금액 카드 */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: sub, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>보유금액 현황</div>
            {editingCapital ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input style={{ ...s.field, flex: 1, fontSize: 15, fontWeight: 700 }} placeholder="시작 금액 (USDT)" value={capitalInput}
                  onChange={(e) => setCapitalInput(e.target.value)} type="number" autoFocus />
                <button onClick={saveCapital} style={{ padding: "11px 16px", background: accent, color: "#000", border: "none", borderRadius: 8, fontWeight: 700, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>저장</button>
                <button onClick={() => { setEditingCapital(false); setCapitalInput(""); }} style={{ padding: "11px 12px", background: "transparent", color: sub, border: `1px solid ${border}`, borderRadius: 8, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>취소</button>
              </div>
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                <div>
                  <div style={{ fontSize: 10, color: sub, marginBottom: 4 }}>시작금액 {cap > 0 ? `${cap.toLocaleString()} USDT` : "미설정"}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: cap > 0 ? (currentBalance >= cap ? green : danger) : sub }}>
                    {cap > 0 ? `${currentBalance.toLocaleString()} USDT` : "—"}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  {cap > 0 && (
                    <>
                      <div style={{ fontSize: 14, fontWeight: 700, color: totalPnl >= 0 ? green : danger }}>{totalPnl >= 0 ? "+" : ""}{totalPnl.toLocaleString()}</div>
                      <div style={{ fontSize: 10, color: sub }}>({((totalPnl / cap) * 100).toFixed(2)}%)</div>
                    </>
                  )}
                  <button onClick={() => { setEditingCapital(true); setCapitalInput(startCapital); }}
                    style={{ marginTop: 8, padding: "5px 12px", background: "transparent", color: accent, border: `1px solid ${accent}30`, borderRadius: 6, fontFamily: "inherit", fontSize: 10, cursor: "pointer", letterSpacing: "0.1em" }}>
                    {cap > 0 ? "수정" : "+ 시작금액 설정"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 잔고 그래프 */}
          {chartData.length >= 2 && cap > 0 && (
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: "14px 8px 8px", marginBottom: 12, overflow: "hidden" }}>
              <div style={{ fontSize: 9, color: sub, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 8 }}>잔고 추이</div>
              <BalanceChart data={chartData} startCapital={cap} green={green} danger={danger} border={border} sub={sub} />
            </div>
          )}

          {/* 통계 */}
          <div style={s.statRow}>
            <div style={s.statCard}><div style={s.statVal(winRate >= 50 ? green : danger)}>{winRate}%</div><div style={s.statLbl}>승률</div></div>
            <div style={s.statCard}><div style={s.statVal()}>{tradeDays}</div><div style={s.statLbl}>거래일</div></div>
            <div style={s.statCard}><div style={s.statVal(totalViolations === 0 ? green : danger)}>{totalViolations}</div><div style={s.statLbl}>총 위반</div></div>
          </div>

          <div style={s.secTitle}><span>최근 기록</span><div style={s.secLine} /></div>

          {historyDays.length === 0 ? (
            <div style={s.emptyHist}>아직 기록이 없습니다<br /><br />매매 후 일지를 작성해보세요</div>
          ) : historyDays.map(([key, d]) => {
            const p = parseFloat(d.pnl) || 0;
            const prevBal = balanceMap[key]?.prev;
            const ror = cap > 0 && d.pnl !== "" && prevBal > 0 ? ((p / prevBal) * 100) : null;
            const violations = RULE_VIOLATIONS.filter((r) => d.violations?.[r.id]).length;

            // 수정 모달
            if (editingKey === key && editDraft) {
              const ep = parseFloat(editDraft.pnl) || 0;
              return (
                <div key={key} style={{ ...s.histCard(p), border: `1.5px solid ${accent}` }}>
                  <div style={{ fontSize: 10, color: accent, marginBottom: 12, letterSpacing: "0.1em" }}>— 수정 중 —</div>

                  <div style={{ marginBottom: 8 }}>
                    <div style={s.fieldLbl}>방향</div>
                    <div style={s.btnRow}>{["LONG", "SHORT", "양방향"].map((dir) => <button key={dir} style={{ ...s.pill(editDraft.direction === dir, dir === "SHORT" ? danger : dir === "LONG" ? green : gold), padding: "5px 10px", fontSize: 10 }} onClick={() => setEditDraft({ ...editDraft, direction: dir })}>{dir}</button>)}</div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <div style={s.fieldLbl}>수익/손실 (USDT)</div>
                    <input style={{ ...s.field, color: ep > 0 ? green : ep < 0 ? danger : text, fontWeight: 700, textAlign: "right" }}
                      value={editDraft.pnl} onChange={(e) => setEditDraft({ ...editDraft, pnl: e.target.value })} type="number" />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={s.fieldLbl}>메모</div>
                    <textarea style={{ ...s.field, minHeight: 80, resize: "none", lineHeight: 1.5, fontSize: 12 }}
                      value={editDraft.note} onChange={(e) => setEditDraft({ ...editDraft, note: e.target.value })} />
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={handleSaveEdit} style={{ flex: 1, padding: "10px", background: accent, color: "#000", border: "none", borderRadius: 8, fontWeight: 700, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>저장</button>
                    <button onClick={() => { setEditingKey(null); setEditDraft(null); }} style={{ padding: "10px 16px", background: "transparent", color: sub, border: `1px solid ${border}`, borderRadius: 8, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>취소</button>
                  </div>
                </div>
              );
            }

            // 삭제 확인
            if (deleteConfirm === key) {
              return (
                <div key={key} style={{ ...s.histCard(p), border: `1.5px solid ${danger}` }}>
                  <div style={{ fontSize: 12, color: text, marginBottom: 14, lineHeight: 1.6 }}>
                    <span style={{ color: danger, fontWeight: 700 }}>{key.replace(/-/g, ".")}</span> 기록을 삭제할까요?<br />
                    <span style={{ fontSize: 11, color: sub }}>삭제 후 복구할 수 없어요.</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleDeleteEntry(key)} style={{ flex: 1, padding: "10px", background: danger, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>삭제</button>
                    <button onClick={() => setDeleteConfirm(null)} style={{ padding: "10px 16px", background: "transparent", color: sub, border: `1px solid ${border}`, borderRadius: 8, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>취소</button>
                  </div>
                </div>
              );
            }

            return (
              <div key={key} style={s.histCard(p)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <div style={s.histDate}>{key === todayKey ? "오늘" : key.replace(/-/g, ".")} · {d.asset || "—"} {d.direction || ""}</div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => handleEditEntry(key)} style={{ padding: "3px 10px", fontSize: 10, background: "transparent", color: sub, border: `1px solid ${border}`, borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>수정</button>
                    <button onClick={() => setDeleteConfirm(key)} style={{ padding: "3px 10px", fontSize: 10, background: "transparent", color: danger, border: `1px solid ${danger}30`, borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>삭제</button>
                  </div>
                </div>
                <div style={s.histRow}>
                  <div>
                    <div style={s.histPnl(p)}>{d.pnl !== "" ? `${p >= 0 ? "+" : ""}${p.toLocaleString()} USDT` : "미기록"}</div>
                    {ror !== null && (
                      <div style={{ fontSize: 11, color: p >= 0 ? green : danger, marginTop: 2 }}>
                        수익률 {p >= 0 ? "+" : ""}{ror.toFixed(2)}%
                      </div>
                    )}
                  </div>
                  <div style={s.histMeta}>위반 {violations}건{d.emotion && <><br />{d.emotion}</>}</div>
                </div>
                {d.note && <div style={s.histNote}>{d.note.slice(0, 80)}{d.note.length > 80 ? "..." : ""}</div>}
              </div>
            );
          })}
        </div>
      )}

      <nav style={s.navBar}>
        {[["check", "☑", "루틴"], ["journal", "✎", "일지"], ["history", "◈", "기록"]].map(([k, icon, label]) => (
          <button key={k} style={s.navBtn(tab === k)} onClick={() => setTab(k)}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
