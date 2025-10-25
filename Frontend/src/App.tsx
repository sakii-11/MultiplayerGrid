import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import GridView from "./GridView";

const SERVER = (import.meta.env.MODE === "production"
    ? import.meta.env.VITE_API_URL
    : "http://localhost:4000");


type Cell = string | null;
type Update = {
  timestamp: number;
  playerId: string;
  cellIndex: number;
  char: string;
};

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [grid, setGrid] = useState<Cell[]>(Array(100).fill(null));
  const [history, setHistory] = useState<Update[]>([]);
  const [playerId, setPlayerId] = useState<string>("");
  const [onlineCount, setOnlineCount] = useState<number>(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const lockedUntilRef = useRef<number | null>(null);

  useEffect(() => {
    const s = io(SERVER,
      { transports: ["websocket", "polling"] ,
       query: {} });
    setSocket(s);

    s.on("init", (payload: { grid: Cell[]; history: Update[]; playerId: string }) => {
      setGrid(payload.grid);
      setHistory(payload.history || []);
      setPlayerId(payload.playerId);
    });

    s.on("updateCell", (payload: { update: Update; grid: Cell[] }) => {
      setGrid(payload.grid);
      setHistory((h) => [...h, payload.update]);
    });

    s.on("online", (payload: { count: number }) => {
      setOnlineCount(payload.count);
    });

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, []);

  useEffect(() => {
    if (!playerId || history.length === 0) return;
    const last = [...history].reverse().find((u) => u.playerId === playerId);
    if (last) {
      const lock = last.timestamp + 60_000;
      setLockedUntil(lock);
      lockedUntilRef.current = lock;
    }
  }, [history, playerId]);

  useEffect(() => {
    const t = setInterval(() => {
      if (lockedUntilRef.current && Date.now() > lockedUntilRef.current) {
        setLockedUntil(null);
        lockedUntilRef.current = null;
      }
    }, 500);
    return () => clearInterval(t);
  }, []);

  const placeChar = async (cellIndex: number, char: string) => {
    if (!socket) return;
    if (lockedUntil && Date.now() < lockedUntil) {
      alert("You are locked from placing until: " + new Date(lockedUntil).toLocaleTimeString());
      return;
    }
    socket.emit("place", { cellIndex, char, playerId }, (resp: any) => {
      if (resp.ok) {
        setLockedUntil(resp.update.timestamp + 60_000);
        lockedUntilRef.current = resp.update.timestamp + 60_000;
      } else {
        alert("Failed to place: " + resp.error);
      }
    });
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1>Multiplayer Grid</h1>
        <div className="online">Online: {onlineCount}</div>
      </header>

      <main>
        <GridView grid={grid} onPlace={placeChar} lockedUntil={lockedUntil} />
        <aside className="side">
          <div className="card">
            <h3>Your ID</h3>
            <div className="mono">{playerId}</div>
            <h4>Lock status</h4>
            {lockedUntil && Date.now() < lockedUntil ? (
              <div>Locked until {new Date(lockedUntil).toLocaleTimeString()}</div>) : (
              <div>Allowed to make a move</div>)}
          </div>

          <div className="card">
            <h3>History (Last 50 moves)</h3>
            <div className="history">
              {history.slice(-50).reverse().map((u, idx) => (
                <div key={idx} className="history-item">
                  <div className="mono">
                    {new Date(u.timestamp).toLocaleTimeString()} - Cell {u.cellIndex} - "{u.char}"
                  </div>
                  <div className="muted">by {u.playerId}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
