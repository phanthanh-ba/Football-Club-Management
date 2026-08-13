import { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const DEFAULT_MEMBERS = [
  { id: 1, name: "Nguyễn Văn A", position: "GK", jerseyNumber: 1, username: "player1", password: "123456", joinDate: "2026-01-01" },
  { id: 2, name: "Trần Văn B", position: "CB", jerseyNumber: 4, username: "player2", password: "123456", joinDate: "2026-01-01" },
  { id: 3, name: "Lê Văn C", position: "CM", jerseyNumber: 8, username: "player3", password: "123456", joinDate: "2026-01-01" },
];

const DEFAULT_SCHEDULE = [
  { id: 101, opponent: "Sao Đỏ FC", date: "2026-08-20", time: "17:00", venue: "Sân Tân Bình", type: "Giao hữu", home: true, votedBy: [], played: false },
];

const DEFAULT_FUND = [
  { id: 1, date: "2026-08-01", type: "in", member: "Nguyễn Văn A", desc: "Quỹ tháng 8", amount: 200000 },
  { id: 2, date: "2026-08-02", type: "out", member: "", desc: "Thuê sân", amount: -350000 },
];

const POS_GROUP = { GK: "GK", CB: "DEF", LB: "DEF", RB: "DEF", CDM: "MID", CM: "MID", CAM: "MID", LM: "MID", RM: "MID", LW: "ATT", RW: "ATT", ST: "ATT", CF: "ATT" };

function loadState(key, fallback) {
  try { const raw = localStorage.getItem("ftms:" + key); return raw === null ? fallback : JSON.parse(raw); }
  catch { return fallback; }
}

function saveState(key, value) {
  try { localStorage.setItem("ftms:" + key, JSON.stringify(value)); } catch {}
}

function calcRating(s, m) {
  const g = POS_GROUP[s.position] ?? "MID";
  const accPct = (s.passesAttempted ?? 0) > 0 ? (s.passesSuccess / (s.passesAttempted ?? 0)) * 100 : null;
  const accBonus = accPct == null ? 0 : accPct >= 85 ? 0.2 : accPct >= 75 ? 0.1 : accPct >= 60 ? 0 : -0.2;
  const goalW = { GK: 1.6, DEF: 1.4, MID: 1.0, ATT: 0.6 }[g];
  const assistW = { GK: 1.2, DEF: 1.2, MID: 0.8, ATT: 0.55 }[g];
  const cleanSheetW = { GK: 0.5, DEF: 0.35, MID: 0.15, ATT: 0.1 }[g];
  const contrib = s.minutesPlayed * 0.002 + s.goals * goalW + s.assists * assistW + s.shotsOnTarget * 0.07 + s.tackles * 0.06 + s.interceptions * 0.06 + s.saves * 0.06 + s.passesSuccess * 0.0025 + (s.keyPasses ?? 0) * 0.1 + (s.dribbles ?? 0) * 0.1 + (s.clearances ?? 0) * 0.025 + (s.ballRecoveries ?? 0) * 0.025 + (s.penaltySaved ?? 0) * 1.0;
  const minFactor = 0.4 + 0.6 * Math.min(1, s.minutesPlayed / 75);
  let total = 5.9 + contrib * minFactor + accBonus;
  if (m.them === 0) total += cleanSheetW;
  if ((g === "GK" || g === "DEF") && m.them >= 3) total -= 0.25 * (m.them - 2);
  total -= (s.yellowCard ? 1 : 0) * 0.35;
  total -= (s.redCard ? 1 : 0) * 1.2;
  total -= (s.penaltyMissed ?? 0) * 0.8;
  total -= (s.ownGoal ?? 0) * 2.0;
  return Math.min(10, Math.max(1, Math.round(total * 10) / 10));
}

function formatCurrency(n) {
  return n.toLocaleString("vi-VN") + " đ";
}

function RatingColor(r) {
  if (r >= 8) return "text-emerald-600";
  if (r >= 7) return "text-amber-600";
  return "text-slate-500";
}

function JerseyCircle({ number, size = "md", onClick, className = "" }) {
  const sizes = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base" };
  return (
    <div onClick={onClick} className={`${sizes[size]} rounded-full bg-gradient-to-br from-blue-500 to-blue-700 border-2 border-blue-300 flex items-center justify-center font-bold text-white cursor-pointer hover:scale-110 transition-transform shadow-md ${className}`}>
      {number}
    </div>
  );
}

function Badge({ children, color = "blue" }) {
  const colors = { blue: "bg-blue-100 text-blue-700", red: "bg-red-100 text-red-700", amber: "bg-amber-100 text-amber-700", emerald: "bg-emerald-100 text-emerald-700", slate: "bg-slate-100 text-slate-600" };
  return <span className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider ${colors[color]}`}>{children}</span>;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => {
    const id = loadState("currentUser", null);
    if (id == null) return null;
    return loadState("members", DEFAULT_MEMBERS).find((m) => m.id === id) ?? null;
  });
  const [authView, setAuthView] = useState(() => loadState("currentUser", null) == null ? "login" : null);
  const [loginUser, setLoginUser] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginError, setLoginError] = useState("");

  const [members, setMembers] = useState(() => loadState("members", DEFAULT_MEMBERS));
  const [schedule, setSchedule] = useState(() => loadState("schedule", DEFAULT_SCHEDULE));
  const [history, setHistory] = useState(() => loadState("history", []));
  const [fundTransactions, setFundTransactions] = useState(() => loadState("fundTransactions", DEFAULT_FUND));
  const [now, setNow] = useState(new Date());
  const [activeTab, setActiveTab] = useState("schedule");

  useEffect(() => { saveState("members", members); }, [members]);
  useEffect(() => { saveState("schedule", schedule); }, [schedule]);
  useEffect(() => { saveState("history", history); }, [history]);
  useEffect(() => { saveState("fundTransactions", fundTransactions); }, [fundTransactions]);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const movedIds = new Set();
    schedule.forEach((m) => {
      const matchTime = new Date(m.date + "T" + m.time);
      if (now >= matchTime && m.opponent && !m.played) movedIds.add(m.id);
    });
    if (movedIds.size > 0) {
      setHistory((prev) => [...prev, ...[...movedIds].map((id) => {
        const m = schedule.find((s) => s.id === id);
        return { id: m.id, date: m.date, opponent: m.opponent, venue: m.venue, type: m.type, lineup: [], playerStats: [] };
      })]);
      setSchedule((prev) => prev.map((m) => movedIds.has(m.id) ? { ...m, played: true } : m));
    }
  }, [now]);

  function handleLogin() {
    const member = members.find((m) => m.username === loginUser && m.password === loginPass);
    if (!member) { setLoginError("Sai tên đăng nhập hoặc mật khẩu"); return; }
    setCurrentUser(member); saveState("currentUser", member.id); setAuthView(null);
    setLoginUser(""); setLoginPass(""); setLoginError("");
  }

  function handleLogout() { setCurrentUser(null); saveState("currentUser", null); setAuthView("login"); }

  function handleRegister(name, position, jersey, username, password) {
    if (members.find((m) => m.username === username)) { alert("Tên đăng nhập đã tồn tại"); return; }
    const newMember = { id: Date.now(), name, position, jerseyNumber: jersey, username, password, joinDate: new Date().toISOString().slice(0, 10) };
    setMembers((prev) => [...prev, newMember]); setCurrentUser(newMember); saveState("currentUser", newMember.id); setAuthView(null);
  }

  function toggleVote(matchId) {
    if (!currentUser) { setAuthView("login"); return; }
    setSchedule((prev) => prev.map((m) => {
      if (m.id !== matchId) return m;
      const has = m.votedBy.includes(currentUser.id);
      return { ...m, votedBy: has ? m.votedBy.filter((id) => id !== currentUser.id) : [...m.votedBy, currentUser.id] };
    }));
  }

  const totalIn = fundTransactions.filter((t) => t.type === "in").reduce((s, t) => s + t.amount, 0);
  const totalOut = fundTransactions.filter((t) => t.type === "out").reduce((s, t) => s + Math.abs(t.amount), 0);
  const balance = 4_850_000 + totalIn - totalOut;

  if (authView === "login") return <LoginForm onLogin={handleLogin} onRegister={() => setAuthView("register")} username={loginUser} setUsername={setLoginUser} password={loginPass} setPassword={setLoginPass} error={loginError} members={members} />;
  if (authView === "register") return <RegisterForm onRegister={handleRegister} onBack={() => setAuthView("login")} />;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-500 flex items-center justify-center text-white font-bold text-sm">FC</div>
            <span className="font-bold text-lg text-slate-800">Young Boys</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-xs text-slate-500">{now.toLocaleTimeString("vi-VN")}</span>
            <div className="flex items-center gap-2">
              <JerseyCircle number={currentUser.jerseyNumber} size="sm" />
              <span className="text-sm font-medium text-slate-700">{currentUser.name}</span>
            </div>
            <button onClick={handleLogout} className="px-3 py-1.5 rounded-md border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors">Đăng xuất</button>
          </div>
        </div>
      </header>

      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {[{ key: "schedule", label: "Lịch thi đấu" }, { key: "history", label: "Lịch sử" }, { key: "members", label: "Thành viên" }, { key: "fund", label: "Quỹ đội" }].map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.key ? "border-blue-500 text-blue-600" : "border-transparent text-slate-500 hover:text-slate-700"}`}>{tab.label}</button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "schedule" && <ScheduleTab schedule={schedule} members={members} currentUser={currentUser} now={now} onVote={toggleVote} onLogin={() => setAuthView("login")} setSchedule={setSchedule} />}
        {activeTab === "history" && <HistoryTab history={history} members={members} setHistory={setHistory} />}
        {activeTab === "members" && <MembersTab members={members} setMembers={setMembers} />}
        {activeTab === "fund" && <FundTab transactions={fundTransactions} setTransactions={setFundTransactions} balance={balance} totalIn={totalIn} totalOut={totalOut} members={members} />}
      </main>
    </div>
  );
}

function LoginForm({ onLogin, onRegister, username, setUsername, password, setPassword, error, members }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-sm shadow-xl border border-slate-200">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">⚽</div>
          <h1 className="font-bold text-2xl text-slate-800">ĐĂNG NHẬP</h1>
          <p className="text-slate-500 text-xs font-mono mt-1">FC Young Boys Management</p>
        </div>
        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-red-600 text-xs">{error}</div>}
        <div className="space-y-4">
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Tên đăng nhập</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onLogin()} placeholder="username" className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Mật khẩu</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onLogin()} placeholder="********" className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all" />
          </div>
          <button onClick={onLogin} className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-bold py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity shadow-md">ĐĂNG NHẬP</button>
          <button onClick={onRegister} className="w-full border border-slate-300 text-slate-600 py-2 rounded-lg text-sm hover:bg-slate-50 transition-colors">Chưa có tài khoản? Đăng ký</button>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-[10px] text-slate-400 text-center">Tài khoản test: player1 / 123456</p>
        </div>
      </div>
    </div>
  );
}

function RegisterForm({ onRegister, onBack }) {
  const [name, setName] = useState("");
  const [position, setPosition] = useState("CM");
  const [jersey, setJersey] = useState(10);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-xl border border-slate-200">
        <h1 className="font-bold text-xl text-slate-800 text-center mb-6">ĐĂNG KÝ THÀNH VIÊN</h1>
        <div className="space-y-3">
          <div><label className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Họ tên</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Vị trí</label><select value={position} onChange={(e) => setPosition(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500">{["GK","CB","LB","RB","CDM","CM","CAM","LM","RM","LW","RW","ST","CF"].map((p) => (<option key={p} value={p}>{p}</option>))}</select></div>
            <div><label className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Số áo</label><input type="number" min={1} max={99} value={jersey} onChange={(e) => setJersey(+e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-center font-bold focus:outline-none focus:border-blue-500" /></div>
          </div>
          <div><label className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Username</label><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" /></div>
          <div><label className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" /></div>
          <button onClick={() => { if (!name.trim() || !username.trim() || !password.trim()) { alert("Điền đầy đủ"); return; } onRegister(name, position, jersey, username, password); }} className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-bold py-2.5 rounded-lg text-sm shadow-md">ĐĂNG KÝ</button>
          <button onClick={onBack} className="w-full border border-slate-300 text-slate-600 py-2 rounded-lg text-sm">Quay lại</button>
        </div>
      </div>
    </div>
  );
}

function ScheduleTab({ schedule, members, currentUser, now, onVote, onLogin, setSchedule }) {
  const [editing, setEditing] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editOpp, setEditOpp] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTime, setEditTime] = useState("");
  const [editVenue, setEditVenue] = useState("");

  function openAdd() { setEditOpp(""); setEditDate(new Date().toISOString().slice(0, 10)); setEditTime("17:00"); setEditVenue(""); setShowAdd(true); }
  function openEdit(m) { setEditing(m); setEditOpp(m.opponent); setEditDate(m.date); setEditTime(m.time); setEditVenue(m.venue); }
  function saveMatch() {
    if (!editOpp.trim() || !editDate || !editTime || !editVenue.trim()) { alert("Điền đầy đủ"); return; }
    if (editing) { setSchedule((prev) => prev.map((m) => m.id === editing.id ? { ...m, opponent: editOpp, date: editDate, time: editTime, venue: editVenue } : m)); }
    else { setSchedule((prev) => [...prev, { id: Date.now(), opponent: editOpp, date: editDate, time: editTime, venue: editVenue, type: "Giao hữu", home: true, votedBy: [], played: false }]); }
    setEditing(null); setShowAdd(false);
  }
  function deleteMatch(id) { if (confirm("Xóa trận đấu này?")) { setSchedule((prev) => prev.filter((m) => m.id !== id)); setEditing(null); } }

  if (showAdd || editing) {
    return (
      <div>
        <h2 className="font-bold text-lg text-slate-800 mb-4">{editing ? "Sửa trận" : "Thêm trận"}</h2>
        <div className="bg-white rounded-xl p-6 max-w-lg shadow-sm border border-slate-200">
          <div className="space-y-3">
            <div><label className="text-[10px] text-slate-500 uppercase font-mono">Đối thủ</label><input value={editOpp} onChange={(e) => setEditOpp(e.target.value)} placeholder="Tên đội" className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] text-slate-500 uppercase font-mono">Ngày</label><input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" /></div>
              <div><label className="text-[10px] text-slate-500 uppercase font-mono">Giờ</label><input type="time" value={editTime} onChange={(e) => setEditTime(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" /></div>
            </div>
            <div><label className="text-[10px] text-slate-500 uppercase font-mono">Địa điểm</label><input value={editVenue} onChange={(e) => setEditVenue(e.target.value)} placeholder="Sân bóng" className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" /></div>
            <div className="flex gap-3">
              <button onClick={saveMatch} className="flex-1 bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-bold py-2.5 rounded-lg text-sm shadow-md">Lưu</button>
              <button onClick={() => { setEditing(null); setShowAdd(false); }} className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm">Hủy</button>
              {editing && <button onClick={() => deleteMatch(editing.id)} className="px-4 bg-red-50 text-red-600 border border-red-200 py-2 rounded-lg text-sm font-medium">Xóa</button>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg text-slate-800">Lịch thi đấu</h2>
        <button onClick={openAdd} className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-sm shadow-md">+ Thêm trận</button>
      </div>
      <div className="space-y-3">
        {schedule.filter((m) => !m.played).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)).map((match) => {
          const matchTime = new Date(match.date + "T" + match.time);
          const isPast = now >= matchTime;
          const hrsUntil = (matchTime.getTime() - now.getTime()) / 3600000;
          const isSoon = hrsUntil > 0 && hrsUntil <= 2;
          const voted = currentUser && match.votedBy.includes(currentUser.id);
          return (
            <div key={match.id} className={`bg-white rounded-xl p-4 shadow-sm border hover:shadow-md transition-shadow ${isPast ? "border-emerald-300 bg-emerald-50/50" : isSoon ? "border-amber-300 bg-amber-50/50" : "border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[50px]">
                    <div className="font-bold text-2xl text-slate-800">{matchTime.getDate()}</div>
                    <div className="text-[10px] text-slate-500 font-mono">Th.{matchTime.getMonth() + 1}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800">{match.opponent}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{match.time} • {match.venue}</div>
                    <div className={`text-xs mt-1 font-medium ${isPast ? "text-emerald-600" : isSoon ? "text-amber-600" : "text-slate-400"}`}>
                      {isPast ? "▶ Đang diễn ra" : hrsUntil < 1 ? `Còn ${Math.round(hrsUntil * 60)} phút` : `Còn ${Math.floor(hrsUntil)}h`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-mono">Vote</div>
                    <div className={`font-bold text-lg ${match.votedBy.length >= 6 ? "text-emerald-600" : match.votedBy.length >= 4 ? "text-amber-600" : "text-red-500"}`}>{match.votedBy.length}/{members.length}</div>
                  </div>
                  <button onClick={() => currentUser ? onVote(match.id) : onLogin()} className={`px-3 py-1.5 rounded-lg text-xs font-medium min-w-[70px] ${voted ? "bg-emerald-500 text-white" : "bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200"}`}>{voted ? "✓ Đã vote" : "Vote"}</button>
                  <button onClick={() => openEdit(match)} className="px-2 py-1.5 rounded-lg text-xs text-slate-500 border border-slate-300 hover:bg-slate-100">Sửa</button>
                  <button onClick={() => deleteMatch(match.id)} className="px-2 py-1.5 rounded-lg text-xs text-red-500 border border-red-200 hover:bg-red-50">Xóa</button>
                </div>
              </div>
              {match.votedBy.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                  {match.votedBy.map((mid) => {
                    const mem = members.find((m) => m.id === mid);
                    return mem ? <Badge key={mid} color="emerald">#{mem.jerseyNumber} {mem.name}</Badge> : null;
                  })}
                </div>
              )}
            </div>
          );
        })}
        {schedule.filter((m) => !m.played).length === 0 && <div className="text-center py-12 text-slate-400 text-sm">Chưa có trận nào.</div>}
      </div>
    </div>
  );
}

function HistoryTab({ history, members, setHistory }) {
  const [editing, setEditing] = useState(null);
  const [draggedId, setDraggedId] = useState(null);
  const movedRef = useRef(false);
  const lastClickRef = useRef({ id: null, time: 0 });
  const MAX_LINEUP = 7;

  function initStat(name, pos) {
    return { playerName: name, position: pos, minutesPlayed: 75, goals: 0, assists: 0, passesSuccess: 0, passesAttempted: 0, tackles: 0, shotsOnTarget: 0, shotsTotal: 0, shotsMissed: 0, interceptions: 0, saves: 0, keyPasses: 0, dribbles: 0, dribbledPast: 0, clearances: 0, ballRecoveries: 0, penaltySaved: 0, penaltyMissed: 0, ownGoal: 0, yellowCard: false, redCard: false, rating: 0 };
  }

  function addPlayer(em, memberId) {
    if (em.lineup.find((l) => l.memberId === memberId)) return;
    if (em.lineup.length >= MAX_LINEUP) return;
    const mem = members.find((m) => m.id === memberId);
    const playerStats = em.playerStats.some((s) => s.playerName === mem.name) ? em.playerStats : [...em.playerStats, initStat(mem.name, mem.position)];
    setEditing({ ...em, lineup: [...em.lineup, { memberId, x: 50, y: 50 }], playerStats });
  }

  function removePlayer(em, memberId) {
    setEditing({ ...em, lineup: em.lineup.filter((l) => l.memberId !== memberId) });
  }

  function updatePos(em, memberId, x, y) {
    setEditing({ ...em, lineup: em.lineup.map((l) => l.memberId === memberId ? { ...l, x, y } : l) });
  }

  function updateStat(em, name, field, value) {
    setEditing({ ...em, playerStats: em.playerStats.map((s) => s.playerName === name ? { ...s, [field]: value } : s) });
  }

  function posFromEvent(e, pitch) {
    const rect = pitch.getBoundingClientRect();
    return {
      x: Math.max(2, Math.min(98, ((e.clientX - rect.left) / rect.width) * 100)),
      y: Math.max(2, Math.min(98, ((e.clientY - rect.top) / rect.height) * 100)),
    };
  }

  function handlePointerDown(e, em, memberId) {
    e.preventDefault();
    e.stopPropagation();
    const pitch = e.currentTarget.closest("[data-pitch]");
    if (!pitch) return;
    pitch.setPointerCapture(e.pointerId);
    movedRef.current = false;
    setDraggedId(memberId);
  }

  function handlePointerMove(e, em) {
    if (!draggedId) return;
    movedRef.current = true;
    const pos = posFromEvent(e, e.currentTarget);
    updatePos(em, draggedId, pos.x, pos.y);
  }

  function handlePointerUp(e) {
    const memberId = draggedId;
    if (!memberId) return;
    setDraggedId(null);
    if (movedRef.current) { movedRef.current = false; return; }
    const now = Date.now();
    if (lastClickRef.current.id === memberId && now - lastClickRef.current.time < 350) {
      lastClickRef.current = { id: null, time: 0 };
      removePlayer(editing, memberId);
    } else {
      lastClickRef.current = { id: memberId, time: now };
    }
  }

  if (editing) {
    const em = editing;
    const lineupIds = em.lineup.map((l) => l.memberId);
    const outsideMembers = members.filter((m) => !lineupIds.includes(m.id));
    const full = em.lineup.length >= MAX_LINEUP;

    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => setEditing(null)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-500 text-xs hover:bg-slate-100">← Quay lại</button>
          <h2 className="font-bold text-lg text-slate-800">{em.opponent}</h2>
          <Badge>{em.date}</Badge>
          <Badge color="slate">{em.venue}</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <div className="text-[10px] text-slate-500 uppercase font-mono mb-2">Sơ đồ - Kéo thả cầu thủ vào sân</div>
            <div data-pitch onPointerMove={(e) => handlePointerMove(e, em)} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} className="border-2 border-green-500 rounded-xl h-[400px] relative overflow-hidden select-none touch-none">
              <div className="absolute inset-0" style={{ background: "repeating-linear-gradient(to right, #4ade80 0, #4ade80 4.5454%, #16a34a 4.5454%, #16a34a 9.0909%)" }}></div>
              <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/30"></div>
              <div className="absolute top-1/2 left-1/2 w-[80px] h-[80px] border-2 border-white/40 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute top-1/2 -translate-y-1/2 left-0 border-2 border-l-0 border-white/40" style={{ width: "4.5454%", height: "14%" }}></div>
              <div className="absolute top-1/2 -translate-y-1/2 left-0 border-2 border-l-0 border-white/40" style={{ width: "9.0909%", height: "28%" }}></div>
              <div className="absolute top-1/2 -translate-y-1/2 right-0 border-2 border-r-0 border-white/40" style={{ width: "4.5454%", height: "14%" }}></div>
              <div className="absolute top-1/2 -translate-y-1/2 right-0 border-2 border-r-0 border-white/40" style={{ width: "9.0909%", height: "28%" }}></div>
              {em.lineup.map((lp) => {
                const member = members.find((m) => m.id === lp.memberId);
                if (!member) return null;
                const dragging = draggedId === lp.memberId;
                return (
                  <div key={lp.memberId} onPointerDown={(e) => handlePointerDown(e, em, lp.memberId)} title="Click 2 lần để đưa ra ngoài, kéo để di chuyển" className={`absolute text-center ${dragging ? "cursor-grabbing scale-110 z-10" : "cursor-grab hover:scale-110"} transition-transform select-none`} style={{ left: lp.x + "%", top: lp.y + "%", transform: "translate(-50%, -50%)" }}>
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-sm text-white shadow-lg ${member.position === "GK" ? "bg-amber-400 border-2 border-amber-300" : "bg-blue-600 border-2 border-blue-400"}`}>{member.jerseyNumber}</div>
                    <div className="text-[9px] text-white mt-0.5 bg-black/50 px-1 rounded whitespace-nowrap">{member.name.split(" ").pop()}</div>
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-slate-500 mt-2">Cầu thủ trong sân: {em.lineup.length}/{MAX_LINEUP} • Click đúp để đưa ra ngoài, kéo để di chuyển</div>
          </div>

          <div>
            <div className="text-[10px] text-slate-500 uppercase font-mono mb-2">Thêm cầu thủ</div>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {outsideMembers.map((m) => (
                <button key={m.id} disabled={full} onClick={() => addPlayer(em, m.id)} className="w-full bg-white rounded-lg p-2.5 flex items-center gap-3 border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed">
                  <JerseyCircle number={m.jerseyNumber} size="sm" />
                  <span className="text-sm text-slate-700">{m.name}</span>
                  <Badge color="slate">{m.position}</Badge>
                </button>
              ))}
              {outsideMembers.length === 0 ? <div className="text-xs text-slate-400 text-center py-4">Tất cả cầu thủ đã trong sân</div> : full && <div className="text-xs text-amber-600 text-center py-2">Đã đủ 7 cầu thủ — click đúp vào cầu thủ trên sân để thay ra</div>}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-[10px] text-slate-500 uppercase font-mono mb-3">Kết quả trận đấu</div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 flex flex-wrap items-center gap-3">
            <span className="font-bold text-sm text-slate-700">Young Boys</span>
            <input type="number" min={0} max={99} value={em.goalsFor ?? 0} onChange={(e) => setEditing({ ...em, goalsFor: Math.max(0, Math.min(99, +e.target.value)) })} className="w-14 bg-slate-50 border border-slate-200 rounded px-1 py-1 text-sm text-center font-bold focus:outline-none focus:border-blue-400" />
            <span className="text-slate-400 font-bold">-</span>
            <input type="number" min={0} max={99} value={em.goalsAgainst ?? 0} onChange={(e) => setEditing({ ...em, goalsAgainst: Math.max(0, Math.min(99, +e.target.value)) })} className="w-14 bg-slate-50 border border-slate-200 rounded px-1 py-1 text-sm text-center font-bold focus:outline-none focus:border-blue-400" />
            <span className="font-bold text-sm text-slate-700">{em.opponent}</span>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-[10px] text-slate-500 uppercase font-mono mb-3">Nhập thống kê cầu thủ (75 phút)</div>
          <div className="space-y-3">
            {em.playerStats.map((s) => {
              const member = members.find((m) => m.name === s.playerName);
              const preview = calcRating(s, { us: 0, them: 0 });
              return (
                <div key={s.playerName} className="bg-white rounded-xl p-4 border border-slate-200">
                  <div className="flex items-center gap-3 mb-3">
                    <JerseyCircle number={member?.jerseyNumber ?? "?"} size="sm" />
                    <span className="font-medium text-sm text-slate-700 flex-1">{s.playerName}</span>
                    <span className={`font-bold text-lg ${RatingColor(preview)}`}>{preview.toFixed(1)}</span>
                  </div>
                  <div className="grid grid-cols-5 gap-2">
                    {[{ key: "minutesPlayed", label: "Phút", max: 75 }, { key: "goals", label: "Bàn", max: 10 }, { key: "assists", label: "Kiến tạo", max: 10 }, { key: "passesSuccess", label: "Chuyền thành công", max: 80 }, { key: "passesAttempted", label: "Tổng C", max: 100 }, { key: "keyPasses", label: "Key passes", max: 12 }, { key: "tackles", label: "Tắc bóng", max: 15 }, { key: "interceptions", label: "Cắt bóng/Đánh chặn", max: 15 }, { key: "dribbles", label: "Rê bóng", max: 12 }, { key: "dribbledPast", label: "Bị qua người", max: 12 }, { key: "shotsOnTarget", label: "Sút chuẩn", max: 10 }, { key: "shotsTotal", label: "Tổng cú sút", max: 20 }, { key: "shotsMissed", label: "Bỏ lỡ", max: 20 }, { key: "clearances", label: "Phá bóng/giải vây", max: 20 }, { key: "ballRecoveries", label: "Cướp lại bóng", max: 20 }, { key: "saves", label: "TM cứu thua", max: 12 }, { key: "yellowCard", label: "Thẻ vàng", max: 1 }, { key: "redCard", label: "Thẻ đỏ", max: 1 }].map(({ key, label, max }) => {
                      const val = s[key] ?? 0;
                      if (key === "yellowCard" || key === "redCard") {
                        return (<div key={key}><div className="text-[8px] text-slate-400 mb-1">{label}</div><button onClick={() => updateStat(em, s.playerName, key, !val)} className={`w-full py-1 rounded text-xs ${val ? (key === "yellowCard" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700") : "bg-slate-100 text-slate-500 border border-slate-200"}`}>{val ? (key === "yellowCard" ? "Vàng" : "Đỏ") : "-"}</button></div>);
                      }
                      return (<div key={key}><div className="text-[8px] text-slate-400 mb-1">{label}</div><input type="number" min={0} max={max} value={val} onChange={(e) => updateStat(em, s.playerName, key, Math.max(0, Math.min(max, +e.target.value)))} className="w-full bg-slate-50 border border-slate-200 rounded px-1 py-1 text-xs text-center focus:outline-none focus:border-blue-400" /></div>);
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-4">
          <button onClick={() => { setHistory((prev) => prev.map((m) => m.id === em.id ? em : m)); setEditing(null); }} className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-bold px-6 py-2.5 rounded-lg text-sm shadow-md">Lưu trận đấu</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="font-bold text-lg text-slate-800 mb-4">Lịch sử đấu</h2>
      <div className="space-y-3">
        {history.length === 0 && <div className="text-center py-12 text-slate-400 text-sm">Chưa có trận nào.</div>}
        {history.slice().sort((a, b) => b.id - a.id).map((match) => (
          <div key={match.id} onClick={() => setEditing(match)} className="bg-white rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow border border-slate-200 flex items-center justify-between">
            <div>
              <div className="font-semibold text-slate-800">{match.opponent}</div>
              <div className="text-xs text-slate-500 mt-0.5">{match.date} • {match.lineup.length} cầu thủ trong sân</div>
            </div>
            <div className="flex items-center gap-4">
              {match.goalsFor !== undefined && match.goalsAgainst !== undefined && <span className="font-bold text-sm text-slate-700">{match.goalsFor} - {match.goalsAgainst}</span>}
              <span className="text-xs text-blue-600 font-medium">Nhập thống kê →</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MembersTab({ members, setMembers }) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState("");
  const [position, setPosition] = useState("CM");
  const [jersey, setJersey] = useState(10);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  function addMember() {
    if (!name.trim() || !username.trim() || !password.trim()) { alert("Điền đầy đủ"); return; }
    if (members.find((m) => m.username === username)) { alert("Username đã tồn tại"); return; }
    setMembers((prev) => [...prev, { id: Date.now(), name: name.trim(), position, jerseyNumber: jersey, username, password, joinDate: new Date().toISOString().slice(0, 10) }]);
    setShowAdd(false); setName(""); setUsername(""); setPassword(""); setJersey(10); setPosition("CM");
  }
  function removeMember(id) { setMembers((prev) => prev.filter((m) => m.id !== id)); }

  if (showAdd) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4"><button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-500 text-xs">← Quay lại</button><h2 className="font-bold text-lg text-slate-800">Thêm thành viên</h2></div>
        <div className="bg-white rounded-xl p-6 max-w-lg shadow-sm border border-slate-200">
          <div className="space-y-3">
            <div><label className="text-[10px] text-slate-500 uppercase font-mono">Họ tên</label><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="text-[10px] text-slate-500 uppercase font-mono">Vị trí</label><select value={position} onChange={(e) => setPosition(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500">{["GK","CB","LB","RB","CDM","CM","CAM","LM","RM","LW","RW","ST","CF"].map((p) => (<option key={p} value={p}>{p}</option>))}</select></div>
              <div><label className="text-[10px] text-slate-500 uppercase font-mono">Số áo</label><input type="number" min={1} max={99} value={jersey} onChange={(e) => setJersey(+e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm text-center font-bold focus:outline-none focus:border-blue-500" /></div>
            </div>
            <div><label className="text-[10px] text-slate-500 uppercase font-mono">Username</label><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" /></div>
            <div><label className="text-[10px] text-slate-500 uppercase font-mono">Password</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500" /></div>
            <button onClick={addMember} className="w-full bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-bold py-2.5 rounded-lg text-sm shadow-md">Thêm</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-lg text-slate-800">Thành viên ({members.length})</h2>
        <button onClick={() => setShowAdd(true)} className="bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-sm shadow-md">+ Thêm</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.map((m) => (
          <div key={m.id} className="bg-white rounded-xl p-4 flex items-center gap-3 border border-slate-200 hover:shadow-md transition-shadow">
            <JerseyCircle number={m.jerseyNumber} />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm text-slate-700 truncate">{m.name}</div>
              <div className="text-xs text-slate-500">{m.position} • {m.joinDate}</div>
            </div>
            <button onClick={() => removeMember(m.id)} className="px-2 py-1 rounded text-xs text-red-500 border border-red-200 hover:bg-red-50">Xóa</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FundTab({ transactions, setTransactions, balance, totalIn, totalOut, members }) {
  const [showAdd, setShowAdd] = useState(false);
  const [txDate, setTxDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [txType, setTxType] = useState("in");
  const [txMember, setTxMember] = useState("");
  const [txDesc, setTxDesc] = useState("");
  const [txAmount, setTxAmount] = useState("");

  function addTransaction() {
    const amount = parseFloat(txAmount);
    if (!txDesc.trim() || isNaN(amount) || amount <= 0) { alert("Nhập mô tả và số tiền"); return; }
    setTransactions((prev) => [...prev, { id: Date.now(), date: txDate, type: txType, member: txMember, desc: txDesc.trim(), amount: txType === "out" ? -Math.abs(amount) : Math.abs(amount) }]);
    setTxDesc(""); setTxAmount(""); setTxMember(""); setShowAdd(false);
  }
  function removeTransaction(id) { setTransactions((prev) => prev.filter((t) => t.id !== id)); }

  return (
    <div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><span className="text-emerald-500">↑</span><span className="text-[10px] text-slate-500 uppercase font-mono">Tổng thu</span></div>
          <div className="font-bold text-2xl text-emerald-600">{formatCurrency(totalIn)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><span className="text-red-500">↓</span><span className="text-[10px] text-slate-500 uppercase font-mono">Tổng chi</span></div>
          <div className="font-bold text-2xl text-red-500">{formatCurrency(totalOut)}</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2"><span className={balance >= 4_850_000 ? "text-emerald-500" : "text-red-500"}>=</span><span className="text-[10px] text-slate-500 uppercase font-mono">Số dư</span></div>
          <div className={`font-bold text-2xl ${balance >= 4_850_000 ? "text-emerald-600" : "text-red-500"}`}>{formatCurrency(balance)}</div>
        </div>
      </div>

      {showAdd && (
        <div className="bg-white rounded-xl p-5 mb-4 border border-slate-200 shadow-sm">
          <div className="font-semibold text-sm text-slate-700 mb-3">Thêm giao dịch</div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div><label className="text-[10px] text-slate-500 font-mono">Ngày</label><input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" /></div>
            <div><label className="text-[10px] text-slate-500 font-mono">Loại</label><select value={txType} onChange={(e) => setTxType(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"><option value="in">Thu</option><option value="out">Chi</option></select></div>
          </div>
          <div className="mb-3"><label className="text-[10px] text-slate-500 font-mono">Thành viên</label><select value={txMember} onChange={(e) => setTxMember(e.target.value)} className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"><option value="">-- Chọn --</option>{members.map((m) => (<option key={m.id} value={m.name}>#{m.jerseyNumber} {m.name}</option>))}</select></div>
          <div className="mb-3"><label className="text-[10px] text-slate-500 font-mono">Mô tả</label><input value={txDesc} onChange={(e) => setTxDesc(e.target.value)} placeholder="Quỹ tháng..." className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" /></div>
          <div className="mb-4"><label className="text-[10px] text-slate-500 font-mono">Số tiền</label><input type="number" min={0} value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="200000" className="w-full mt-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500" /></div>
          <div className="flex gap-3">
            <button onClick={addTransaction} className="flex-1 bg-gradient-to-r from-blue-500 to-emerald-500 text-white font-bold py-2 rounded-lg text-sm shadow-md">Thêm</button>
            <button onClick={() => setShowAdd(false)} className="flex-1 border border-slate-300 text-slate-600 py-2 rounded-lg text-sm">Hủy</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <span className="font-semibold text-slate-700">Lịch sử giao dịch</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAdd(!showAdd)} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${showAdd ? "bg-red-500 text-white" : "bg-gradient-to-r from-blue-500 to-emerald-500 text-white"}`}>{showAdd ? "Đóng" : "+ Giao dịch"}</button>
            <span className="text-[10px] text-slate-400 font-mono">{transactions.length} GD</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="bg-slate-50">{["Ngày","Loại","Mô tả","Thành viên","Số tiền",""].map((h) => (<th key={h} className="px-4 py-2.5 text-[10px] text-slate-500 font-mono uppercase tracking-wider text-left">{h}</th>))}</tr></thead>
            <tbody>
              {transactions.slice().sort((a, b) => b.id - a.id).map((tx, i) => (
                <tr key={tx.id} className={i < transactions.length - 1 ? "border-b border-slate-100" : ""}>
                  <td className="px-4 py-3 text-xs text-slate-500">{tx.date}</td>
                  <td className="px-4 py-3"><Badge color={tx.type === "in" ? "emerald" : "red"}>{tx.type === "in" ? "Thu" : "Chi"}</Badge></td>
                  <td className="px-4 py-3 text-sm text-slate-700">{tx.desc}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{tx.member || "—"}</td>
                  <td className={`px-4 py-3 text-sm font-bold text-right ${tx.type === "in" ? "text-emerald-600" : "text-red-500"}`}>{tx.type === "in" ? "+" : ""}{formatCurrency(tx.amount)}</td>
                  <td className="px-4 py-3 text-center"><button onClick={() => removeTransaction(tx.id)} className="text-red-400 text-xs hover:bg-red-50 px-2 py-1 rounded">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);