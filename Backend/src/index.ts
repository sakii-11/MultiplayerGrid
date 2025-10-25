import express from "express";
import http from "http";
import { Server as SocketIOServer, Socket } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import { Request, Response } from "express";



type Cell = string | null;
type Grid = Cell[]; //length =100
type Update = {
    timestamp: number,
    playerId: string;
    cellIndex: number;
    char: string;
}


const app = express();
const allowedOrigin =
  process.env.NODE_ENV === "production"
    ? process.env.FRONTEND_URL
    : process.env.DEV_FRONTEND_URL;

app.use(cors({
  origin: allowedOrigin,
  methods: ["GET", "POST"],
  credentials: true
}));

app.use(express.json());

const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: allowedOrigin,
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket","polling"] 
});

const GRID_SIZE = 100;
const TIMED_RESTRICTION_MS = 60_000;  //1 minute

//In-memory store
let grid : Grid = Array(GRID_SIZE).fill(null);
let history: Update[] = [];


const players: Map<string, { lastSubmitAt: number | null; lockedUntil: number | null; socketId?: string }> =
  new Map();

function getOnlineCount() {
  let count = 0;
  for (const [, v] of players) {
    if (v.socketId) count++;
  }
  return count;
}


// Route to get the grid
app.get("/grid", (req: Request, res: Response) => {
  res.json({ grid, history });
});

// Route to get the history
app.get("/history", (req: Request, res: Response) => {
  res.json({ history });
});


// Socket.IO events
io.on("connection", (socket: Socket) => {
  let playerId = socket.handshake.query.playerId as string | undefined;
  if (!playerId) playerId = socket.id;

  // registers player
  const prev = players.get(playerId) || { lastSubmitAt: null, lockedUntil: null };
  prev.socketId = socket.id;
  players.set(playerId, prev);

  socket.emit("init", { grid, history, playerId });
  io.emit("online", { count: getOnlineCount() });

  socket.on("place", (payload: { cellIndex: number; char: string; playerId?: string }, ack: (resp: any) => void) => {
    try {
      const pid = payload.playerId || playerId!;
      const p = players.get(pid) || { lastSubmitAt: null, lockedUntil: null, socketId: undefined };

      const idx = payload.cellIndex;
      if (idx < 0 || idx >= GRID_SIZE) {
        return ack({ ok: false, error: "invalid cell index" });
      }
      if (!payload.char || payload.char.length === 0) {
        return ack({ ok: false, error: "invalid char" });
      }

      if (grid[idx] !== null) {
        return ack({ ok: false, error: "cell already occupied" });
      }

      const now = Date.now();

      if (p.lockedUntil && p.lockedUntil > now) {
        return ack({ ok: false, error: "player locked (try later)" });
      }

      grid[idx] = payload.char;
      const update: Update = {
        timestamp: now,
        playerId: pid,
        cellIndex: idx,
        char: payload.char
      };
      history.push(update);

      p.lastSubmitAt = now;
      p.lockedUntil = now + TIMED_RESTRICTION_MS;
      players.set(pid, p);

      io.emit("updateCell", { update, grid });
      io.emit("online", { count: getOnlineCount() });

      ack({ ok: true, update });
    } catch (err) {
      ack({ ok: false, error: (err as Error).message });
    }
  });

  socket.on("requestHistory", (ack: (resp: any) => void) => {
    ack({ ok: true, history });
  });

  socket.on("disconnect", () => {
    for (const [pid, v] of players.entries()) {
      if (v.socketId === socket.id) {
        v.socketId = undefined;
        players.set(pid, v);
      }
    }
    io.emit("online", { count: getOnlineCount() });
  });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
server.listen(PORT, () => {console.log(`Server listening on ${PORT}`);});