import { useState, useEffect } from "react";

const CHECKLIST_ITEMS = [
  { id: "market", label: "시장 전반 상황 확인 (지수, 변동성)" },
  { id: "bias", label: "오늘의 방향성(Bias) 설정 완료" },
  { id: "levels", label: "핵심 지지/저항 레벨 표시 완료" },
  { id: "news", label: "주요 경제 지표/뉴스 확인" },
  { id: "size", label: "오늘의 포지션 사이즈 결정" },
  { id: "loss", label: "최대 손실 한도 설정 (일간)" },
  { id: "plan", label: "진입 시나리오 A/B 플랜 수립" },
  { id: "emotion", label: "심리 상태 안정적 (분노/흥분 없음)" },
];

const RULE_VIOLATIONS = [
  { id: "oversize", label: "과도한 포지션 사이즈" },
  { id: "revenge", label: "복수 매매" },
  { id: "plan_dev", label: "플랜 이탈 매매" },
  { id: "daily_loss", label: "일일 손실 한도 초과" },
  { id: "fomo", label: "FOMO 진입" },
  { id: "early_exit", label: "조기 청산 (공포로 인한)" },
];

const ASSETS = ["선물", "옵션", "BTC", "ETH", "기타"];
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
  direction: "",
  entry: "",
  exit: "",
  pnl: "",
  emotion: "",
  note: "",
  saved: false,
});

export default function App() {
  const [tab, setTab] = useState("check"); // check | journal | history
  const [todayKey] = useState(getTodayKey());
  const [log, setLog] = useState(EMPTY_LOG());
  const [history, setHistory] = useState({});
  const [saved, setSaved] = useState(false);
  const [saveAnim, setSaveAnim] = useState(false);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("tradeHistory") || "{}");
      setHistory(stored);
      if (stored[todayKey]) {
        setLog(stored[todayKey]);
        setSaved(stored[todayKey].saved || false);
      }
    } catch {}
  }, []);

  const updateHistory = (newLog) => {
    const updated = { ...history, [todayKey]: newLog };
    setHistory(updated);
    try { localStorage.setItem("tradeHistory", JSON.stringify(updated)); } catch {}
  };

  const toggleCheck = (id) => {
    const newLog = { ...log, checklist: { ...log.checklist, [id]: !log.checklist[id] } };
    setLog(newLog);
    updateHistory(newLog);
  };

  const toggleViolation = (id) => {
    const newLog = { ...log, violations: { ...log.violations, [id]: !log.violations[id] } };
    setLog(newLog);
    updateHistory(newLog);
  };

  const setField = (key, val) => {
    const newLog = { ...log, [key]: val };
    setLog(newLog);
    updateHistory(newLog);
  };

  const handleSave = () => {
    const newLog = { ...log, saved: true };
    setLog(newLog);
    updateHistory(newLog);
    setSaved(true);
    setSaveAnim(true);
    setTimeout(() => setSaveAnim(false), 1200);
  };

  const checkedCount = CHECKLIST_ITEMS.filter((i) => log.checklist[i.id]).length;
  const checkPct = Math.round((checkedCount / CHECKLIST_ITEMS.length) * 100);
  const violationCount = RULE_VIOLATIONS.filter((i) => log.violations[i.id]).length;
  const pnlNum = parseFloat(log.pnl) || 0;

  const historyDays = Object.entries(history)
    .filter(([k]) => k !== todayKey)
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .slice(0, 14);

  const accent = "#00E5FF";
  const danger = "#FF3D5A";
  const gold = "#FFD166";
  const green = "#06D6A0";
  const bg = "#0A0C0F";
  const card = "#111418";
  const border = "#1E2329";
  const muted = "#4B5563";
  const text = "#E8ECF0";
  const sub = "#8B95A1";

  const styles = {
    app: {
      minHeight: "100vh",
      background: bg,
      color: text,
      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      maxWidth: 480,
      margin: "0 auto",
      paddingBottom: 80,
    },
    header: {
      padding: "20px 20px 0",
      borderBottom: `1px solid ${border}`,
    },
    headerTop: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: 8,
    },
    title: {
      fontSize: 11,
      letterSpacing: "0.2em",
      color: accent,
      textTransform: "uppercase",
      marginBottom: 2,
    },
    date: {
      fontSize: 18,
      fontWeight: 700,
      color: text,
      letterSpacing: "-0.02em",
    },
    scoreBadge: {
      display: "flex",
      flexDirection: "column",
      alignItems: "flex-end",
    },
    scoreNum: {
      fontSize: 28,
      fontWeight: 700,
      color: checkPct === 100 ? green : checkPct >= 75 ? gold : accent,
      lineHeight: 1,
    },
    scoreLabel: { fontSize: 9, color: sub, letterSpacing: "0.15em", textTransform: "uppercase" },
    progressBar: {
      height: 3,
      background: border,
      margin: "12px 0 0",
      position: "relative",
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      width: `${checkPct}%`,
      background: checkPct === 100 ? green : accent,
      transition: "width 0.4s ease",
    },
    tabs: {
      display: "flex",
      borderBottom: `1px solid ${border}`,
      background: card,
    },
    tab: (active) => ({
      flex: 1,
      padding: "14px 8px",
      fontSize: 10,
      letterSpacing: "0.15em",
      textTransform: "uppercase",
      border: "none",
      background: "none",
      cursor: "pointer",
      color: active ? accent : muted,
      borderBottom: active ? `2px solid ${accent}` : "2px solid transparent",
      transition: "all 0.2s",
      fontFamily: "inherit",
    }),
    content: { padding: "16px 16px 0" },
    section: { marginBottom: 20 },
    sectionTitle: {
      fontSize: 9,
      letterSpacing: "0.2em",
      color: accent,
      textTransform: "uppercase",
      marginBottom: 10,
      display: "flex",
      alignItems: "center",
      gap: 8,
    },
    sectionLine: { flex: 1, height: 1, background: border },
    checkItem: (checked) => ({
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "12px 14px",
      marginBottom: 4,
      background: checked ? "rgba(0,229,255,0.04)" : card,
      border: `1px solid ${checked ? "rgba(0,229,255,0.2)" : border}`,
      borderRadius: 8,
      cursor: "pointer",
      transition: "all 0.2s",
    }),
    checkbox: (checked) => ({
      width: 18,
      height: 18,
      border: `1.5px solid ${checked ? accent : muted}`,
      borderRadius: 4,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      background: checked ? accent : "transparent",
      transition: "all 0.2s",
    }),
    checkLabel: (checked) => ({
      fontSize: 12,
      color: checked ? text : sub,
      lineHeight: 1.4,
      transition: "color 0.2s",
    }),
    violationItem: (checked) => ({
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "11px 14px",
      marginBottom: 4,
      background: checked ? "rgba(255,61,90,0.07)" : card,
      border: `1px solid ${checked ? "rgba(255,61,90,0.35)" : border}`,
      borderRadius: 8,
      cursor: "pointer",
      transition: "all 0.2s",
    }),
    vBox: (checked) => ({
      width: 18,
      height: 18,
      border: `1.5px solid ${checked ? danger : muted}`,
      borderRadius: 4,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      background: checked ? danger : "transparent",
      transition: "all 0.2s",
    }),
    field: {
      width: "100%",
      background: card,
      border: `1px solid ${border}`,
      borderRadius: 8,
      padding: "11px 14px",
      color: text,
      fontSize: 13,
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box",
    },
    fieldLabel: {
      fontSize: 9,
      color: sub,
      letterSpacing: "0.15em",
      textTransform: "uppercase",
      marginBottom: 6,
    },
    row: { display: "flex", gap: 10, marginBottom: 10 },
    col: { flex: 1 },
    btnRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 },
    pill: (active, color = accent) => ({
      padding: "7px 14px",
      borderRadius: 20,
      fontSize: 11,
      border: `1px solid ${active ? color : border}`,
      background: active ? `${color}18` : "transparent",
      color: active ? color : sub,
      cursor: "pointer",
      fontFamily: "inherit",
      transition: "all 0.2s",
    }),
    pnlInput: {
      width: "100%",
      background: card,
      border: `1px solid ${pnlNum > 0 ? "rgba(6,214,160,0.4)" : pnlNum < 0 ? "rgba(255,61,90,0.4)" : border}`,
      borderRadius: 8,
      padding: "11px 14px",
      color: pnlNum > 0 ? green : pnlNum < 0 ? danger : text,
      fontSize: 16,
      fontWeight: 700,
      fontFamily: "inherit",
      outline: "none",
      boxSizing: "border-box",
      textAlign: "right",
    },
    saveBtn: {
      width: "100%",
      padding: "15px",
      borderRadius: 10,
      border: "none",
      background: saveAnim ? green : `linear-gradient(135deg, ${accent}, #0099B4)`,
      color: "#000",
      fontSize: 12,
      fontWeight: 700,
      letterSpacing: "0.2em",
      textTransform: "uppercase",
      cursor: "pointer",
      fontFamily: "inherit",
      transition: "all 0.3s",
      marginTop: 8,
    },
    histCard: (pnl) => ({
      padding: "14px",
      marginBottom: 8,
      background: card,
      border: `1px solid ${border}`,
      borderRadius: 10,
      borderLeft: `3px solid ${pnl > 0 ? green : pnl < 0 ? danger : muted}`,
    }),
    histDate: { fontSize: 10, color: sub, marginBottom: 6, letterSpacing: "0.05em" },
    histRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
    histPnl: (pnl) => ({
      fontSize: 18,
      fontWeight: 700,
      color: pnl > 0 ? green : pnl < 0 ? danger : muted,
    }),
    histMeta: { fontSize: 10, color: sub, textAlign: "right" },
    histNote: { fontSize: 11, color: sub, marginTop: 6, lineHeight: 1.5 },
    emptyHist: { textAlign: "center", color: muted, fontSize: 12, padding: "40px 0", letterSpacing: "0.05em" },
    statRow: { display: "flex", gap: 8, marginBottom: 16 },
    statCard: {
      flex: 1,
      background: card,
      border: `1px solid ${border}`,
      borderRadius: 10,
      padding: "14px 12px",
      textAlign: "center",
    },
    statVal: (color) => ({ fontSize: 20, fontWeight: 700, color: color || text }),
    statLbl: { fontSize: 9, color: sub, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: 3 },
    navBar: {
      position: "fixed",
      bottom: 0,
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: 480,
      background: card,
      borderTop: `1px solid ${border}`,
      display: "flex",
    },
    navBtn: (active) => ({
      flex: 1,
      padding: "14px 8px 18px",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: 4,
      border: "none",
      background: "none",
      cursor: "pointer",
      color: active ? accent : muted,
      fontFamily: "inherit",
      fontSize: 9,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      transition: "color 0.2s",
    }),
  };

  // History stats
  const allDays = Object.values(history);
  const totalPnl = allDays.reduce((s, d) => s + (parseFloat(d.pnl) || 0), 0);
  const winDays = allDays.filter((d) => (parseFloat(d.pnl) || 0) > 0).length;
  const tradeDays = allDays.filter((d) => d.pnl !== "").length;
  const winRate = tradeDays > 0 ? Math.round((winDays / tradeDays) * 100) : 0;

  return (
    <div style={styles.app}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <div>
            <div style={styles.title}>Trading Routine</div>
            <div style={styles.date}>{formatDate(new Date())}</div>
          </div>
          <div style={styles.scoreBadge}>
            <div style={styles.scoreNum}>{checkPct}%</div>
            <div style={styles.scoreLabel}>Ready</div>
          </div>
        </div>
        <div style={styles.progressBar}>
          <div style={styles.progressFill} />
        </div>
        <div style={styles.tabs}>
          {[["check", "체크리스트"], ["journal", "매매일지"], ["history", "히스토리"]].map(([k, l]) => (
            <button key={k} style={styles.tab(tab === k)} onClick={() => setTab(k)}>{l}</button>
          ))}
        </div>
      </div>

      {/* Checklist Tab */}
      {tab === "check" && (
        <div style={styles.content}>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <span>매매 전 루틴</span>
              <div style={styles.sectionLine} />
              <span style={{ color: sub, fontSize: 10 }}>{checkedCount}/{CHECKLIST_ITEMS.length}</span>
            </div>
            {CHECKLIST_ITEMS.map((item) => (
              <div key={item.id} style={styles.checkItem(!!log.checklist[item.id])} onClick={() => toggleCheck(item.id)}>
                <div style={styles.checkbox(!!log.checklist[item.id])}>
                  {log.checklist[item.id] && <span style={{ fontSize: 11, color: "#000", fontWeight: 900 }}>✓</span>}
                </div>
                <span style={styles.checkLabel(!!log.checklist[item.id])}>{item.label}</span>
              </div>
            ))}
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <span style={{ color: danger }}>규칙 위반 체크</span>
              <div style={{ ...styles.sectionLine, background: "rgba(255,61,90,0.2)" }} />
              {violationCount > 0 && (
                <span style={{ color: danger, fontSize: 10 }}>{violationCount}건</span>
              )}
            </div>
            {RULE_VIOLATIONS.map((item) => (
              <div key={item.id} style={styles.violationItem(!!log.violations[item.id])} onClick={() => toggleViolation(item.id)}>
                <div style={styles.vBox(!!log.violations[item.id])}>
                  {log.violations[item.id] && <span style={{ fontSize: 11, color: "#fff", fontWeight: 900 }}>!</span>}
                </div>
                <span style={{ ...styles.checkLabel(true), color: log.violations[item.id] ? danger : sub }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Journal Tab */}
      {tab === "journal" && (
        <div style={styles.content}>
          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <span>거래 정보</span>
              <div style={styles.sectionLine} />
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={styles.fieldLabel}>자산</div>
              <div style={styles.btnRow}>
                {ASSETS.map((a) => (
                  <button key={a} style={styles.pill(log.asset === a)} onClick={() => setField("asset", a)}>{a}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={styles.fieldLabel}>방향</div>
              <div style={styles.btnRow}>
                {["LONG", "SHORT", "양방향"].map((d) => (
                  <button key={d} style={styles.pill(log.direction === d, d === "SHORT" ? danger : d === "LONG" ? green : gold)}
                    onClick={() => setField("direction", d)}>{d}</button>
                ))}
              </div>
            </div>

            <div style={styles.row}>
              <div style={styles.col}>
                <div style={styles.fieldLabel}>진입가</div>
                <input style={styles.field} placeholder="0.00" value={log.entry}
                  onChange={(e) => setField("entry", e.target.value)} type="number" />
              </div>
              <div style={styles.col}>
                <div style={styles.fieldLabel}>청산가</div>
                <input style={styles.field} placeholder="0.00" value={log.exit}
                  onChange={(e) => setField("exit", e.target.value)} type="number" />
              </div>
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={styles.fieldLabel}>수익/손실 (₩ or %)</div>
              <input style={styles.pnlInput} placeholder="0" value={log.pnl}
                onChange={(e) => setField("pnl", e.target.value)} type="number" />
            </div>
          </div>

          <div style={styles.section}>
            <div style={styles.sectionTitle}>
              <span>심리 & 회고</span>
              <div style={styles.sectionLine} />
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={styles.fieldLabel}>매매 당시 심리</div>
              <div style={styles.btnRow}>
                {EMOTIONS.map((e) => (
                  <button key={e} style={{ ...styles.pill(log.emotion === e, gold), fontSize: 12 }}
                    onClick={() => setField("emotion", e)}>{e}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={styles.fieldLabel}>매매 일지</div>
              <textarea style={{ ...styles.field, minHeight: 120, resize: "vertical", lineHeight: 1.6 }}
                placeholder={"시나리오대로 진행됐나?\n잘된 점 / 개선할 점\n다음에 적용할 교훈"}
                value={log.note} onChange={(e) => setField("note", e.target.value)} />
            </div>

            <button style={styles.saveBtn} onClick={handleSave}>
              {saveAnim ? "✓ 저장 완료" : "오늘 일지 저장"}
            </button>
          </div>
        </div>
      )}

      {/* History Tab */}
      {tab === "history" && (
        <div style={styles.content}>
          <div style={styles.statRow}>
            <div style={styles.statCard}>
              <div style={styles.statVal(totalPnl >= 0 ? green : danger)}>
                {totalPnl >= 0 ? "+" : ""}{totalPnl.toLocaleString()}
              </div>
              <div style={styles.statLbl}>누적 손익</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statVal(winRate >= 50 ? green : danger)}>{winRate}%</div>
              <div style={styles.statLbl}>승률</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statVal()}>{tradeDays}</div>
              <div style={styles.statLbl}>거래일</div>
            </div>
          </div>

          <div style={styles.sectionTitle}>
            <span>최근 기록</span>
            <div style={styles.sectionLine} />
          </div>

          {/* Today */}
          {log.pnl !== "" || log.note !== "" ? (
            <div style={styles.histCard(pnlNum)}>
              <div style={styles.histDate}>오늘 · {log.asset || "—"} {log.direction || ""}</div>
              <div style={styles.histRow}>
                <div style={styles.histPnl(pnlNum)}>
                  {pnlNum >= 0 ? "+" : ""}{pnlNum.toLocaleString()}
                </div>
                <div style={styles.histMeta}>
                  체크 {checkedCount}/{CHECKLIST_ITEMS.length}<br />
                  위반 {violationCount}건
                </div>
              </div>
              {log.note && <div style={styles.histNote}>{log.note.slice(0, 80)}{log.note.length > 80 ? "..." : ""}</div>}
            </div>
          ) : null}

          {historyDays.length === 0 && !log.pnl ? (
            <div style={styles.emptyHist}>아직 기록이 없습니다<br /><br />매매 후 일지를 작성해보세요</div>
          ) : (
            historyDays.map(([key, d]) => {
              const p = parseFloat(d.pnl) || 0;
              const dateStr = key.replace(/-/g, ".");
              const violations = RULE_VIOLATIONS.filter((r) => d.violations?.[r.id]).length;
              return (
                <div key={key} style={styles.histCard(p)}>
                  <div style={styles.histDate}>{dateStr} · {d.asset || "—"} {d.direction || ""}</div>
                  <div style={styles.histRow}>
                    <div style={styles.histPnl(p)}>
                      {d.pnl !== "" ? `${p >= 0 ? "+" : ""}${p.toLocaleString()}` : "미기록"}
                    </div>
                    <div style={styles.histMeta}>
                      위반 {violations}건
                      {d.emotion && <><br />{d.emotion}</>}
                    </div>
                  </div>
                  {d.note && <div style={styles.histNote}>{d.note.slice(0, 80)}{d.note.length > 80 ? "..." : ""}</div>}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Bottom Nav */}
      <nav style={styles.navBar}>
        {[
          ["check", "☑", "루틴"],
          ["journal", "✎", "일지"],
          ["history", "◈", "기록"],
        ].map(([k, icon, label]) => (
          <button key={k} style={styles.navBtn(tab === k)} onClick={() => setTab(k)}>
            <span style={{ fontSize: 20 }}>{icon}</span>
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
