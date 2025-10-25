# MultiplayerGrid

## Tech Stack

- **Frontend:** React
- **Backend:** Node.js, Express, Socket.IO
- **Deployment:** Vercel (frontend) + Render (backend)
- **Language:** TypeScript 
- **LLM:** : ChatGPT

---
## Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/sakii-11/Multiplayer_Grid.git

cd MultiplayerGrid
```
---
### 2. Setup the backend

```bash
cd Backend
npm install
```


Create a .env file in /Backend with the following:

```bash
DEV_FRONTEND_URL=http://localhost:5173          
NODE_ENV=development                            
PORT=4000
```

Then run locally:

```bash
npm run dev
```

Backend should be live at http://localhost:4000

---

### 3. Setup the frontend

```bash
cd ..
cd frontend
npm install
```

Create a .env file in /Frontend with:

```bash
MODE=development
```

Then run:
```bash
npm run dev
```
frontend will be live at http://localhost:5173. You can play the game through this in real time.



