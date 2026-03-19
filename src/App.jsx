import { useState, useEffect } from "react";

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
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,"0")}.${String(d.getDate()).padStart(2,"0")} (${days[d.getDay()]})`;
};

const getTodayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`;
};

const newTrade = () => ({
  id: Date.now(),
  direction: "",
  entry: "",
  exit: "",
  pnl: "",
  pnlType: "profit",
  emotion: "",
  note: "",
});

const newDayLog = () => ({
  checklist: {},
  violations: {},
  dailyBias: "",
  biasNote: "",
  trades: [],
});

// SVG Balance Chart
function BalanceChart({ data, startCapital, green, danger, border, sub }) {
  if (!data || data.length < 2) return null;
  const W = 440, H = 150, PAD = { top: 16, right: 16, bottom: 28, left: 56 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const balances = data.map(d => d.balance);
  const allVals = [startCapital, ...balances];
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const range = maxVal - minVal || 1;
  const xScale = i => PAD.left + (i / (data.length - 1)) * innerW;
  const yScale = v => PAD.top + innerH - ((v - minVal) / range) * innerH;
  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${xScale(i)},${yScale(d.balance)}`).join(" ");
  const areaPath = `${linePath} L${xScale(data.length-1)},${PAD.top+innerH} L${xScale(0)},${PAD.top+innerH} Z`;
  const lineColor = balances[balances.length-1] >= startCapital ? green : danger;
  const yLabels = [minVal, maxVal].map(v => ({
    y: yScale(v),
    label: v >= 1000 ? `${(v/1000).toFixed(1)}K` : v.toFixed(0),
  }));
  const step = Math.max(1, Math.floor(data.length / 4));
  const xLabels = data.filter((_, i) => i % step === 0 || i === data.length-1).map((d, _, arr) => ({
    label: d.key.split("-").slice(1).join("/"),
    x: xScale(data.indexOf(d)),
  }));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <defs>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {yLabels.map((l, i) => (
        <line key={i} x1={PAD.left} x2={W-PAD.right} y1={l.y} y2={l.y} stroke={border} strokeWidth="1" strokeDasharray="3,4" />
      ))}
      <path d={areaPath} fill="url(#ag)" />
      <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={i} cx={xScale(i)} cy={yScale(d.balance)} r={i === data.length-1 ? 4 : 2.5}
          fill={i === data.length-1 ? lineColor : (d.balance >= (i > 0 ? data[i-1].balance : startCapital) ? green : danger)} />
      ))}
      {yLabels.map((l, i) => (
        <text key={i} x={PAD.left-6} y={l.y+4} textAnchor="end" fontSize="9" fill={sub} fontFamily="'IBM Plex Mono',monospace">{l.label}</text>
      ))}
      {xLabels.map((l, i) => (
        <text key={i} x={l.x} y={H-4} textAnchor="middle" fontSize="9" fill={sub} fontFamily="'IBM Plex Mono',monospace">{l.label}</text>
      ))}
    </svg>
  );
}

export default function App() {
  const [tab, setTab] = useState("check");
  const [todayKey] = useState(getTodayKey());

  // 날짜별 { checklist, violations, dailyBias, biasNote, trades: [...] }
  const [history, setHistory] = useState({});
  const [todayLog, setTodayLog] = useState(newDayLog());

  // 현재 작성 중인 매매
  const [trade, setTrade] = useState(newTrade());
  const [saveAnim, setSaveAnim] = useState(false);

  // 시작금액
  const [startCapital, setStartCapital] = useState("");
  const [editingCapital, setEditingCapital] = useState(false);
  const [capitalInput, setCapitalInput] = useState("");

  // bias
  const [biasEditing, setBiasEditing] = useState(false);

  // 히스토리 편집/삭제
  const [deletingDay, setDeletingDay] = useState(null);
  const [deletingTrade, setDeletingTrade] = useState(null);
  const [editingTrade, setEditingTrade] = useState(null); // { dayKey, tradeId }
  const [editDraft, setEditDraft] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);

  // 목표금액
  const [targetCapital, setTargetCapital] = useState("");
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState("");

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("tradeHistory2") || "{}");
      setHistory(stored);
      if (stored[todayKey]) setTodayLog(stored[todayKey]);
      const cap = localStorage.getItem("startCapital");
      if (cap) setStartCapital(cap);
      const tgt = localStorage.getItem("targetCapital");
      if (tgt) setTargetCapital(tgt);
    } catch {}
  }, []);

  const persist = (hist) => {
    try { localStorage.setItem("tradeHistory2", JSON.stringify(hist)); } catch {}
  };

  const updateTodayLog = (newLog) => {
    const updated = { ...history, [todayKey]: newLog };
    setHistory(updated);
    persist(updated);
  };

  const toggleCheck = (id) => {
    const newLog = { ...todayLog, checklist: { ...todayLog.checklist, [id]: !todayLog.checklist[id] } };
    setTodayLog(newLog);
    updateTodayLog(newLog);
  };

  const toggleViolation = (id) => {
    const newLog = { ...todayLog, violations: { ...todayLog.violations, [id]: !todayLog.violations[id] } };
    setTodayLog(newLog);
    updateTodayLog(newLog);
  };

  const setBiasField = (key, val) => {
    const newLog = { ...todayLog, [key]: val };
    setTodayLog(newLog);
    updateTodayLog(newLog);
  };

  const setTradeField = (key, val) => {
    setTrade(prev => ({ ...prev, [key]: val }));
  };

  const handleSaveTrade = () => {
    if (trade.pnl === "" && trade.note === "" && trade.direction === "") return;
    const signedPnl = String(Math.abs(parseFloat(trade.pnl) || 0) * (trade.pnlType === "loss" ? -1 : 1));
    const saved = { ...trade, pnl: signedPnl, savedAt: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }) };
    const newLog = { ...todayLog, trades: [...(todayLog.trades || []), saved] };
    setTodayLog(newLog);
    updateTodayLog(newLog);
    setTrade(newTrade());
    setSaveAnim(true);
    setTimeout(() => setSaveAnim(false), 1200);
  };

  const handleDeleteTrade = (dayKey, tradeId) => {
    const dayData = dayKey === todayKey ? todayLog : history[dayKey];
    const updated = { ...dayData, trades: dayData.trades.filter(t => t.id !== tradeId) };
    const newHist = { ...history, [dayKey]: updated };
    setHistory(newHist);
    persist(newHist);
    if (dayKey === todayKey) setTodayLog(updated);
    setDeletingTrade(null);
  };

  const handleDeleteDay = (dayKey) => {
    const newHist = { ...history };
    delete newHist[dayKey];
    setHistory(newHist);
    persist(newHist);
    if (dayKey === todayKey) setTodayLog(newDayLog());
    setDeletingDay(null);
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

  const saveTarget = () => {
    const val = targetInput.replace(/,/g, "");
    if (!isNaN(val) && val !== "") {
      setTargetCapital(val);
      localStorage.setItem("targetCapital", val);
    }
    setEditingTarget(false);
    setTargetInput("");
  };

  const handleEditTrade = (dayKey, tradeId) => {
    const dayData = dayKey === todayKey ? todayLog : history[dayKey];
    const t = dayData.trades.find(t => t.id === tradeId);
    if (!t) return;
    setEditDraft({ ...t, pnlType: parseFloat(t.pnl) < 0 ? "loss" : "profit", pnl: String(Math.abs(parseFloat(t.pnl) || 0)) });
    setEditingTrade({ dayKey, tradeId });
  };

  const handleSaveEditTrade = () => {
    if (!editingTrade || !editDraft) return;
    const { dayKey, tradeId } = editingTrade;
    const signedPnl = String(Math.abs(parseFloat(editDraft.pnl) || 0) * (editDraft.pnlType === "loss" ? -1 : 1));
    const updated = { ...editDraft, pnl: signedPnl };
    const dayData = dayKey === todayKey ? todayLog : history[dayKey];
    const newTrades = dayData.trades.map(t => t.id === tradeId ? updated : t);
    const newDay = { ...dayData, trades: newTrades };
    const newHist = { ...history, [dayKey]: newDay };
    setHistory(newHist);
    persist(newHist);
    if (dayKey === todayKey) setTodayLog(newDay);
    setEditingTrade(null);
    setEditDraft(null);
  };

  // 계산
  const cap = parseFloat(startCapital) || 0;
  const checkedCount = CHECKLIST_ITEMS.filter(i => todayLog.checklist[i.id]).length;
  const checkPct = Math.round((checkedCount / CHECKLIST_ITEMS.length) * 100);
  const violationCount = RULE_VIOLATIONS.filter(i => todayLog.violations[i.id]).length;
  const pnlNum = (parseFloat(trade.pnl) || 0) * (trade.pnlType === "loss" ? -1 : 1);

  // 전체 통계
  const allDays = Object.entries(history).sort(([a], [b]) => a < b ? 1 : -1);
  const allTrades = allDays.flatMap(([, d]) => d.trades || []);
  const totalPnl = allTrades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
  const winTrades = allTrades.filter(t => (parseFloat(t.pnl) || 0) > 0).length;
  const winRate = allTrades.length > 0 ? Math.round((winTrades / allTrades.length) * 100) : 0;
  const currentBalance = cap + totalPnl;
  const tgt = parseFloat(targetCapital) || 0;
  const targetPct = tgt > 0 && cap > 0 ? Math.min((totalPnl / (tgt - cap)) * 100, 999) : 0;

  // 차트 데이터: 날짜별 누적 잔고
  let running = cap;
  const chartData = [...allDays].reverse().map(([key, d]) => {
    const dayPnl = (d.trades || []).reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
    running += dayPnl;
    return { key, balance: running };
  });

  // 색상
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
    tab: (a) => ({ flex: 1, padding: "14px 8px", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", border: "none", background: "none", cursor: "pointer", color: a ? accent : muted, borderBottom: a ? `2px solid ${accent}` : "2px solid transparent", transition: "all 0.2s", fontFamily: "inherit" }),
    content: { padding: "16px 16px 0" },
    section: { marginBottom: 20 },
    secTitle: { fontSize: 10, letterSpacing: "0.18em", color: accent, textTransform: "uppercase", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 },
    secLine: { flex: 1, height: 1, background: border },
    checkItem: (c) => ({ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", marginBottom: 4, background: c ? "rgba(0,229,255,0.05)" : card, border: `1px solid ${c ? "rgba(0,229,255,0.25)" : border}`, borderRadius: 8, cursor: "pointer", transition: "all 0.2s" }),
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
    saveBtn: { width: "100%", padding: "15px", borderRadius: 10, border: "none", background: saveAnim ? green : `linear-gradient(135deg,${accent},#0099B4)`, color: "#000", fontSize: 12, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit", transition: "all 0.3s", marginTop: 8 },
    navBar: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: card, borderTop: `1px solid ${border}`, display: "flex" },
    navBtn: (a) => ({ flex: 1, padding: "14px 8px 18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, border: "none", background: "none", cursor: "pointer", color: a ? accent : muted, fontFamily: "inherit", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", transition: "color 0.2s" }),
    statRow: { display: "flex", gap: 8, marginBottom: 12 },
    statCard: { flex: 1, background: card, border: `1px solid ${border}`, borderRadius: 10, padding: "14px 12px", textAlign: "center" },
    statVal: (c) => ({ fontSize: 18, fontWeight: 700, color: c || text }),
    statLbl: { fontSize: 10, color: sub, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 4 },
  };

  const tradeCard = (t, dayKey) => {
    const p = parseFloat(t.pnl) || 0;
    const isDeleting = deletingTrade?.dayKey === dayKey && deletingTrade?.tradeId === t.id;
    const isEditing = editingTrade?.dayKey === dayKey && editingTrade?.tradeId === t.id;

    if (isDeleting) return (
      <div key={t.id} style={{ padding: "12px 14px", marginBottom: 6, background: card, border: `1.5px solid ${danger}`, borderRadius: 10 }}>
        <div style={{ fontSize: 12, color: text, marginBottom: 12 }}>이 매매 기록을 삭제할까요?<br /><span style={{ fontSize: 11, color: sub }}>삭제 후 복구할 수 없어요.</span></div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => handleDeleteTrade(dayKey, t.id)} style={{ flex: 1, padding: "9px", background: danger, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>삭제</button>
          <button onClick={() => setDeletingTrade(null)} style={{ padding: "9px 14px", background: "transparent", color: sub, border: `1px solid ${border}`, borderRadius: 8, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>취소</button>
        </div>
      </div>
    );

    if (isEditing && editDraft) {
      const ep = parseFloat(editDraft.pnl) || 0;
      return (
        <div key={t.id} style={{ padding: "14px", marginBottom: 6, background: card, border: `1.5px solid ${accent}`, borderRadius: 10 }}>
          <div style={{ fontSize: 10, color: accent, letterSpacing: "0.1em", marginBottom: 12 }}>— 수정 중 —</div>
          <div style={{ marginBottom: 8 }}>
            <div style={s.fieldLbl}>방향</div>
            <div style={s.btnRow}>
              {["LONG", "SHORT"].map(d => (
                <button key={d} style={s.pill(editDraft.direction === d, d === "SHORT" ? danger : green)} onClick={() => setEditDraft({ ...editDraft, direction: d })}>{d}</button>
              ))}
            </div>
          </div>
          <div style={s.row}>
            <div style={s.col}><div style={s.fieldLbl}>진입가</div><input style={s.field} placeholder="0.00" value={editDraft.entry} onChange={e => setEditDraft({ ...editDraft, entry: e.target.value })} type="number" /></div>
            <div style={s.col}><div style={s.fieldLbl}>청산가</div><input style={s.field} placeholder="0.00" value={editDraft.exit} onChange={e => setEditDraft({ ...editDraft, exit: e.target.value })} type="number" /></div>
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={s.fieldLbl}>수익 / 손실</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <button onClick={() => setEditDraft({ ...editDraft, pnlType: "profit" })} style={{ flex: 1, padding: "9px", borderRadius: 8, border: `1.5px solid ${editDraft.pnlType !== "loss" ? "rgba(6,214,160,0.6)" : border}`, background: editDraft.pnlType !== "loss" ? "rgba(6,214,160,0.1)" : "transparent", color: editDraft.pnlType !== "loss" ? green : sub, fontWeight: 700, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>📈 수익</button>
              <button onClick={() => setEditDraft({ ...editDraft, pnlType: "loss" })} style={{ flex: 1, padding: "9px", borderRadius: 8, border: `1.5px solid ${editDraft.pnlType === "loss" ? "rgba(255,61,90,0.6)" : border}`, background: editDraft.pnlType === "loss" ? "rgba(255,61,90,0.1)" : "transparent", color: editDraft.pnlType === "loss" ? danger : sub, fontWeight: 700, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>📉 손실</button>
            </div>
            <input style={{ ...s.field, color: editDraft.pnlType === "loss" ? danger : green, fontWeight: 700, textAlign: "right" }}
              placeholder="0.00" value={editDraft.pnl} onChange={e => setEditDraft({ ...editDraft, pnl: e.target.value })} type="number" />
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={s.fieldLbl}>메모</div>
            <textarea style={{ ...s.field, minHeight: 72, resize: "none", lineHeight: 1.5, fontSize: 12 }}
              value={editDraft.note} onChange={e => setEditDraft({ ...editDraft, note: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleSaveEditTrade} style={{ flex: 1, padding: "10px", background: accent, color: "#000", border: "none", borderRadius: 8, fontWeight: 700, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>저장</button>
            <button onClick={() => { setEditingTrade(null); setEditDraft(null); }} style={{ padding: "10px 14px", background: "transparent", color: sub, border: `1px solid ${border}`, borderRadius: 8, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>취소</button>
          </div>
        </div>
      );
    }
    return (
      <div key={t.id} style={{ padding: "12px 14px", marginBottom: 6, background: bg, border: `1px solid ${border}`, borderRadius: 10, borderLeft: `3px solid ${p > 0 ? green : p < 0 ? danger : muted}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: sub }}>{t.savedAt || ""}</span>
            {t.direction && <span style={{ fontSize: 11, fontWeight: 700, color: t.direction === "LONG" ? green : danger }}>{t.direction}</span>}
            <span style={{ fontSize: 11, color: gold }}>14x</span>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            <button onClick={() => handleEditTrade(dayKey, t.id)} style={{ padding: "2px 8px", fontSize: 10, background: "transparent", color: sub, border: `1px solid ${border}`, borderRadius: 5, cursor: "pointer", fontFamily: "inherit" }}>수정</button>
            <button onClick={() => setDeletingTrade({ dayKey, tradeId: t.id })} style={{ padding: "2px 8px", fontSize: 10, background: "transparent", color: danger, border: `1px solid ${danger}30`, borderRadius: 5, cursor: "pointer", fontFamily: "inherit" }}>삭제</button>
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: p > 0 ? green : p < 0 ? danger : muted }}>
              {p >= 0 ? "+" : ""}{p.toLocaleString()} USDT
            </div>
            {cap > 0 && t.pnl !== "" && (() => {
              const ror = (p / cap) * 100;
              return <div style={{ fontSize: 11, color: p >= 0 ? green : danger, marginTop: 2 }}>수익률 {p >= 0 ? "+" : ""}{ror.toFixed(2)}%</div>;
            })()}
          </div>
          {t.emotion && <div style={{ fontSize: 13 }}>{t.emotion}</div>}
        </div>
        {t.note && <div style={{ fontSize: 11, color: sub, marginTop: 6, lineHeight: 1.6 }}>{t.note}</div>}
      </div>
    );
  };

  return (
    <div style={s.app}>
      {/* Header */}
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

      {/* ── 체크리스트 탭 ── */}
      {tab === "check" && (
        <div style={s.content}>
          {/* Daily Bias */}
          <div style={s.section}>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", color: sub, textTransform: "uppercase", marginBottom: 10 }}>Daily Bias</div>
            {!biasEditing && !todayLog.dailyBias ? (
              <div onClick={() => setBiasEditing(true)} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "28px 16px", background: card, border: `2px dashed ${border}`, borderRadius: 14, cursor: "pointer" }}>
                <span style={{ fontSize: 13, color: muted }}>+ 오늘의 바이어스 입력</span>
              </div>
            ) : biasEditing ? (
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 14, padding: 16 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {[["BULLISH", "📈", green], ["BEARISH", "📉", danger], ["NEUTRAL", "➡️", gold]].map(([key, icon, col]) => (
                    <button key={key} onClick={() => setBiasField("dailyBias", key)}
                      style={{ flex: 1, padding: "10px 4px", borderRadius: 10, border: `1.5px solid ${todayLog.dailyBias === key ? col : border}`, background: todayLog.dailyBias === key ? `${col}18` : "transparent", color: todayLog.dailyBias === key ? col : sub, fontFamily: "inherit", fontSize: 11, fontWeight: todayLog.dailyBias === key ? 700 : 400, cursor: "pointer" }}>
                      {icon} {key}
                    </button>
                  ))}
                </div>
                <textarea style={{ ...s.field, minHeight: 72, resize: "none", lineHeight: 1.6, fontSize: 12, marginBottom: 10 }}
                  placeholder="바이어스 근거 메모 (지지/저항, 추세, 뉴스 등)"
                  value={todayLog.biasNote} onChange={e => setBiasField("biasNote", e.target.value)} />
                <button onClick={() => setBiasEditing(false)} style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: accent, color: "#000", fontWeight: 700, fontFamily: "inherit", fontSize: 11, cursor: "pointer" }}>확인</button>
              </div>
            ) : (
              <div onClick={() => setBiasEditing(true)} style={{ background: todayLog.dailyBias === "BULLISH" ? "rgba(6,214,160,0.07)" : todayLog.dailyBias === "BEARISH" ? "rgba(255,61,90,0.07)" : "rgba(255,209,102,0.07)", border: `1.5px solid ${todayLog.dailyBias === "BULLISH" ? "rgba(6,214,160,0.3)" : todayLog.dailyBias === "BEARISH" ? "rgba(255,61,90,0.3)" : "rgba(255,209,102,0.3)"}`, borderRadius: 14, padding: "18px 20px", cursor: "pointer" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: todayLog.biasNote ? 10 : 0 }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: todayLog.dailyBias === "BULLISH" ? green : todayLog.dailyBias === "BEARISH" ? danger : gold }}>
                    {todayLog.dailyBias === "BULLISH" ? "📈 BULLISH" : todayLog.dailyBias === "BEARISH" ? "📉 BEARISH" : "➡️ NEUTRAL"}
                  </div>
                  <span style={{ fontSize: 10, color: sub }}>수정 ✎</span>
                </div>
                {todayLog.biasNote && <div style={{ fontSize: 12, color: sub, lineHeight: 1.6 }}>{todayLog.biasNote}</div>}
              </div>
            )}
          </div>

          {/* 체크리스트 */}
          <div style={s.section}>
            <div style={s.secTitle}>
              <span>매매 전 루틴</span><div style={s.secLine} />
              <span style={{ color: sub, fontSize: 10 }}>{checkedCount}/{CHECKLIST_ITEMS.length}</span>
            </div>
            {CHECKLIST_ITEMS.map(item => (
              <div key={item.id} style={s.checkItem(!!todayLog.checklist[item.id])} onClick={() => toggleCheck(item.id)}>
                <div style={s.checkbox(!!todayLog.checklist[item.id])}>
                  {todayLog.checklist[item.id] && <span style={{ fontSize: 11, color: "#000", fontWeight: 900 }}>✓</span>}
                </div>
                <span style={s.chkLabel(!!todayLog.checklist[item.id])}>{item.label}</span>
              </div>
            ))}
          </div>

          {/* 규칙 위반 */}
          <div style={s.section}>
            <div style={s.secTitle}>
              <span style={{ color: danger }}>규칙 위반 체크</span>
              <div style={{ ...s.secLine, background: "rgba(255,61,90,0.2)" }} />
              {violationCount > 0 && <span style={{ color: danger, fontSize: 10 }}>{violationCount}건</span>}
            </div>
            {RULE_VIOLATIONS.map(item => (
              <div key={item.id} style={s.vioItem(!!todayLog.violations[item.id])} onClick={() => toggleViolation(item.id)}>
                <div style={s.vBox(!!todayLog.violations[item.id])}>
                  {todayLog.violations[item.id] && <span style={{ fontSize: 11, color: "#fff", fontWeight: 900 }}>!</span>}
                </div>
                <span style={{ ...s.chkLabel(true), color: todayLog.violations[item.id] ? danger : sub }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 매매일지 탭 ── */}
      {tab === "journal" && (
        <div style={s.content}>
          {/* 오늘 저장된 매매 목록 */}
          {(todayLog.trades || []).length > 0 && (
            <div style={s.section}>
              <div style={s.secTitle}>
                <span>오늘 매매</span><div style={s.secLine} />
                <span style={{ color: sub, fontSize: 10 }}>{todayLog.trades.length}건</span>
              </div>
              {todayLog.trades.map(t => tradeCard(t, todayKey))}
            </div>
          )}

          {/* 새 매매 입력 */}
          <div style={s.section}>
            <div style={s.secTitle}><span>새 매매 기록</span><div style={s.secLine} /></div>

            {/* 레버리지 고정 */}
            <div style={{ marginBottom: 10 }}>
              <div style={s.fieldLbl}>레버리지</div>
              <div style={{ display: "inline-block", padding: "8px 20px", borderRadius: 8, border: `1px solid ${gold}`, background: `${gold}18`, color: gold, fontWeight: 700, fontSize: 14 }}>14x</div>
            </div>

            {/* 방향 */}
            <div style={{ marginBottom: 10 }}>
              <div style={s.fieldLbl}>방향</div>
              <div style={s.btnRow}>
                {["LONG", "SHORT"].map(d => (
                  <button key={d} style={s.pill(trade.direction === d, d === "SHORT" ? danger : green)} onClick={() => setTradeField("direction", d)}>{d}</button>
                ))}
              </div>
            </div>

            {/* 진입/청산 */}
            <div style={s.row}>
              <div style={s.col}><div style={s.fieldLbl}>진입가</div><input style={s.field} placeholder="0.00" value={trade.entry} onChange={e => setTradeField("entry", e.target.value)} type="number" /></div>
              <div style={s.col}><div style={s.fieldLbl}>청산가</div><input style={s.field} placeholder="0.00" value={trade.exit} onChange={e => setTradeField("exit", e.target.value)} type="number" /></div>
            </div>

            {/* 수익/손실 버튼 */}
            <div style={{ marginBottom: 10 }}>
              <div style={s.fieldLbl}>수익 / 손실</div>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <button onClick={() => setTradeField("pnlType", "profit")}
                  style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1.5px solid ${trade.pnlType !== "loss" ? "rgba(6,214,160,0.6)" : border}`, background: trade.pnlType !== "loss" ? "rgba(6,214,160,0.1)" : "transparent", color: trade.pnlType !== "loss" ? green : sub, fontWeight: 700, fontFamily: "inherit", fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>
                  📈 수익
                </button>
                <button onClick={() => setTradeField("pnlType", "loss")}
                  style={{ flex: 1, padding: "10px", borderRadius: 8, border: `1.5px solid ${trade.pnlType === "loss" ? "rgba(255,61,90,0.6)" : border}`, background: trade.pnlType === "loss" ? "rgba(255,61,90,0.1)" : "transparent", color: trade.pnlType === "loss" ? danger : sub, fontWeight: 700, fontFamily: "inherit", fontSize: 13, cursor: "pointer", transition: "all 0.2s" }}>
                  📉 손실
                </button>
              </div>
              <input style={{ width: "100%", background: card, border: `1px solid ${trade.pnlType === "loss" ? "rgba(255,61,90,0.4)" : "rgba(6,214,160,0.4)"}`, borderRadius: 8, padding: "11px 14px", color: trade.pnlType === "loss" ? danger : green, fontSize: 16, fontWeight: 700, fontFamily: "inherit", outline: "none", boxSizing: "border-box", textAlign: "right", caretColor: accent }}
                placeholder="0.00 USDT" value={trade.pnl} onChange={e => setTradeField("pnl", e.target.value)} type="number" />
            </div>

            {/* 심리 */}
            <div style={{ marginBottom: 10 }}>
              <div style={s.fieldLbl}>심리</div>
              <div style={s.btnRow}>{EMOTIONS.map(e => <button key={e} style={{ ...s.pill(trade.emotion === e, gold), fontSize: 12 }} onClick={() => setTradeField("emotion", e)}>{e}</button>)}</div>
            </div>

            {/* 메모 */}
            <div style={{ marginBottom: 14 }}>
              <div style={s.fieldLbl}>메모</div>
              <textarea style={{ ...s.field, minHeight: 100, resize: "vertical", lineHeight: 1.6 }}
                placeholder={"시나리오대로 진행됐나?\n잘된 점 / 개선할 점\n다음에 적용할 교훈"}
                value={trade.note} onChange={e => setTradeField("note", e.target.value)} />
            </div>

            <button style={s.saveBtn} onClick={handleSaveTrade}>
              {saveAnim ? "✓ 저장 완료" : "매매 기록 저장"}
            </button>
          </div>
        </div>
      )}

      {/* ── 히스토리 탭 ── */}
      {tab === "history" && (
        <div style={s.content}>
          {/* 보유금액 */}
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: sub, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>보유금액 현황</div>
            {editingCapital ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input style={{ ...s.field, flex: 1, fontSize: 15, fontWeight: 700 }} placeholder="시작 금액 (USDT)" value={capitalInput} onChange={e => setCapitalInput(e.target.value)} type="number" autoFocus />
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
                  {cap > 0 && <>
                    <div style={{ fontSize: 14, fontWeight: 700, color: totalPnl >= 0 ? green : danger }}>{totalPnl >= 0 ? "+" : ""}{totalPnl.toLocaleString()}</div>
                    <div style={{ fontSize: 10, color: sub }}>({((totalPnl / cap) * 100).toFixed(2)}%)</div>
                  </>}
                  <button onClick={() => { setEditingCapital(true); setCapitalInput(startCapital); }}
                    style={{ marginTop: 8, padding: "5px 12px", background: "transparent", color: accent, border: `1px solid ${accent}30`, borderRadius: 6, fontFamily: "inherit", fontSize: 10, cursor: "pointer" }}>
                    {cap > 0 ? "수정" : "+ 시작금액 설정"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 차트 */}
          {chartData.length >= 2 && cap > 0 && (
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: "14px 8px 8px", marginBottom: 12, overflow: "hidden" }}>
              <div style={{ fontSize: 9, color: sub, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 8, paddingLeft: 8 }}>잔고 추이</div>
              <BalanceChart data={chartData} startCapital={cap} green={green} danger={danger} border={border} sub={sub} />
            </div>
          )}

          {/* 통계 */}
          <div style={s.statRow}>
            <div style={s.statCard}><div style={s.statVal(green)}>{winTrades}승</div><div style={s.statLbl}>수익</div></div>
            <div style={s.statCard}><div style={s.statVal(danger)}>{allTrades.length - winTrades}패</div><div style={s.statLbl}>손해</div></div>
            <div style={{ ...s.statCard, cursor: "pointer", position: "relative", overflow: "hidden" }} onClick={() => { setEditingTarget(true); setTargetInput(targetCapital); }}>
              {tgt > 0 && (
                <div style={{ position: "absolute", bottom: 0, left: 0, height: 3, width: `${Math.min(targetPct, 100)}%`, background: targetPct >= 100 ? green : accent, transition: "width 0.5s ease" }} />
              )}
              <div style={s.statVal(targetPct >= 100 ? green : targetPct > 0 ? accent : sub)}>
                {tgt > 0 ? `${targetPct.toFixed(1)}%` : "—"}
              </div>
              <div style={s.statLbl}>목표달성</div>
              {!tgt && <div style={{ fontSize: 9, color: accent, marginTop: 2 }}>탭하여 설정</div>}
            </div>
          </div>

          {/* 목표금액 설정 모달 */}
          {editingTarget && (
            <div style={{ background: card, border: `1px solid ${accent}40`, borderRadius: 12, padding: 16, marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: accent, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>목표금액 설정</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input style={{ ...s.field, flex: 1, fontSize: 15, fontWeight: 700 }} placeholder="목표 금액 (USDT)" value={targetInput}
                  onChange={e => setTargetInput(e.target.value)} type="number" autoFocus />
                <button onClick={saveTarget} style={{ padding: "11px 16px", background: accent, color: "#000", border: "none", borderRadius: 8, fontWeight: 700, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>저장</button>
                <button onClick={() => setEditingTarget(false)} style={{ padding: "11px 12px", background: "transparent", color: sub, border: `1px solid ${border}`, borderRadius: 8, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>취소</button>
              </div>
              {tgt > 0 && cap > 0 && (
                <div style={{ fontSize: 11, color: sub, marginTop: 10 }}>
                  현재 {currentBalance.toLocaleString()} / 목표 {tgt.toLocaleString()} USDT
                  <span style={{ color: accent, marginLeft: 8 }}>({(tgt - currentBalance).toLocaleString()} 남음)</span>
                </div>
              )}
            </div>
          )}

          {/* 날짜별 기록 */}
          <div style={s.secTitle}><span>날짜별 기록</span><div style={s.secLine} /></div>

          {allDays.length === 0 ? (
            <div style={{ textAlign: "center", color: muted, fontSize: 12, padding: "40px 0" }}>아직 기록이 없습니다<br /><br />매매 후 일지를 작성해보세요</div>
          ) : allDays.map(([key, d]) => {
            const trades = d.trades || [];
            const dayPnl = trades.reduce((s, t) => s + (parseFloat(t.pnl) || 0), 0);
            const isExpanded = expandedDay === key;
            const isDeleting = deletingDay === key;

            if (isDeleting) return (
              <div key={key} style={{ padding: "14px", marginBottom: 8, background: card, border: `1.5px solid ${danger}`, borderRadius: 12 }}>
                <div style={{ fontSize: 12, color: text, marginBottom: 12 }}><span style={{ color: danger, fontWeight: 700 }}>{key === todayKey ? "오늘" : key.replace(/-/g, ".")}</span> 전체 기록을 삭제할까요?<br /><span style={{ fontSize: 11, color: sub }}>매매 {trades.length}건이 모두 삭제돼요.</span></div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleDeleteDay(key)} style={{ flex: 1, padding: "10px", background: danger, color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>삭제</button>
                  <button onClick={() => setDeletingDay(null)} style={{ padding: "10px 14px", background: "transparent", color: sub, border: `1px solid ${border}`, borderRadius: 8, fontFamily: "inherit", fontSize: 12, cursor: "pointer" }}>취소</button>
                </div>
              </div>
            );

            return (
              <div key={key} style={{ marginBottom: 10 }}>
                {/* 날짜 헤더 */}
                <div onClick={() => setExpandedDay(isExpanded ? null : key)}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", background: card, border: `1px solid ${border}`, borderRadius: isExpanded ? "10px 10px 0 0" : 10, cursor: "pointer", borderLeft: `3px solid ${dayPnl > 0 ? green : dayPnl < 0 ? danger : muted}` }}>
                  <div>
                    <div style={{ fontSize: 11, color: sub, marginBottom: 3 }}>{key === todayKey ? "오늘" : key.replace(/-/g, ".")} · {trades.length}건</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: dayPnl > 0 ? green : dayPnl < 0 ? danger : muted }}>
                      {dayPnl >= 0 ? "+" : ""}{dayPnl.toLocaleString()} USDT
                    </div>
                    {cap > 0 && trades.length > 0 && (
                      <div style={{ fontSize: 11, color: dayPnl >= 0 ? green : danger, marginTop: 2 }}>
                        수익률 {dayPnl >= 0 ? "+" : ""}{((dayPnl / cap) * 100).toFixed(2)}%
                      </div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={e => { e.stopPropagation(); setDeletingDay(key); }}
                      style={{ padding: "4px 10px", fontSize: 10, background: "transparent", color: danger, border: `1px solid ${danger}30`, borderRadius: 6, cursor: "pointer", fontFamily: "inherit" }}>삭제</button>
                    <span style={{ color: sub, fontSize: 14 }}>{isExpanded ? "▲" : "▼"}</span>
                  </div>
                </div>

                {/* 매매 상세 */}
                {isExpanded && (
                  <div style={{ background: `${card}99`, border: `1px solid ${border}`, borderTop: "none", borderRadius: "0 0 10px 10px", padding: "10px 10px" }}>
                    {trades.length === 0
                      ? <div style={{ fontSize: 12, color: muted, textAlign: "center", padding: "16px 0" }}>매매 기록 없음</div>
                      : trades.map(t => tradeCard(t, key))
                    }
                    {d.dailyBias && (
                      <div style={{ marginTop: 8, padding: "8px 12px", background: bg, borderRadius: 8, fontSize: 11, color: sub }}>
                        Bias: <span style={{ color: d.dailyBias === "BULLISH" ? green : d.dailyBias === "BEARISH" ? danger : gold, fontWeight: 700 }}>{d.dailyBias}</span>
                        {d.biasNote && ` · ${d.biasNote}`}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Nav */}
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
