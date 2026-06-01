# 💬 ChatApp — Full-Stack Real-Time Chat

A WhatsApp/Discord-style chat application built with React, Node.js, Socket.IO, and MongoDB.

## ✨ Features

| Feature | Details |
|---|---|
| 🔐 JWT Authentication | Register, login, protected routes |
| 💬 One-to-One Chat | Real-time DMs with read receipts |
| 👥 Group Chat | Create groups, add/remove members, admin roles |
| ⌨️ Typing Indicators | Live "is typing..." indicator |
| 🟢 Online/Offline Status | Real-time presence with last seen |
| 📎 Media Upload | Images, files, audio up to 50MB |
| 🎤 Voice Messages | Record & send voice messages in-browser |
| 📹 Video Calling | WebRTC peer-to-peer video & audio calls |
| 💬 Reply to Messages | Quote-reply any message |
| 🗑️ Delete Messages | Delete your own messages |
| 🔔 Unread Badges | Per-room unread message count |
| 👤 Profile Editor | Update username, bio, avatar URL |

## 🗂️ Tech Stack

**Backend:** Node.js, Express, Socket.IO, MongoDB (Mongoose), JWT, Multer  
**Frontend:** React, Vite, TailwindCSS, Zustand, Socket.IO-client, Axios  
**Video:** WebRTC (native browser APIs), ICE/STUN via Google's public servers

## 🚀 Setup & Run

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Backend
```bash
cd server
npm install
# Edit .env — set MONGO_URI and JWT_SECRET
npm run dev        # development (nodemon)
# or
npm start          # production
```

### 2. Frontend
```bash
cd client
npm install
# Edit .env — set VITE_API_URL and VITE_SOCKET_URL
npm run dev        # development
# or
npm run build && npm run preview   # production preview
```

### Environment Variables

**server/.env**
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=change_this_to_a_long_random_string
CLIENT_URL=http://localhost:3000
```

**client/.env**
```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

## 🌐 Deployment

### Backend → Render / Railway
1. Set env vars in dashboard
2. Build command: `npm install`
3. Start command: `node index.js`
4. Set `CLIENT_URL` to your frontend URL

### Frontend → Vercel / Netlify
1. Set `VITE_API_URL` and `VITE_SOCKET_URL` to backend URL
2. Build command: `npm run build`
3. Output directory: `dist`

### MongoDB Atlas (Free Tier)
1. Create cluster at mongodb.com/atlas
2. Whitelist `0.0.0.0/0` for IP access
3. Copy connection string → `MONGO_URI`

## 📡 Socket.IO Events

| Event | Direction | Payload |
|---|---|---|
| `message:send` | Client→Server | `{ roomId, content, type, fileUrl, replyTo }` |
| `message:new` | Server→Client | Full message object |
| `message:delete` | Client→Server | `{ messageId }` |
| `message:deleted` | Server→Client | `{ messageId, roomId }` |
| `message:read` | Client→Server | `{ roomId }` |
| `typing:start/stop` | Client→Server | `{ roomId }` |
| `user:online` | Server→Client | `{ userId, isOnline }` |
| `call:initiate` | Client→Server | `{ targetUserId, isVideo }` |
| `call:incoming` | Server→Client | `{ from, isVideo }` |
| `webrtc:offer/answer/ice-candidate` | Both | WebRTC signaling |

## 📁 Project Structure

```
chatapp/
├── server/
│   ├── models/        User, Message, Room
│   ├── routes/        auth, rooms, upload
│   ├── middleware/    JWT auth guard
│   ├── socket/        All Socket.IO handlers
│   ├── uploads/       Media files (local storage)
│   └── index.js       Entry point
└── client/
    └── src/
        ├── components/
        │   ├── auth/
        │   ├── chat/  MessageBubble, MessageInput, ChatArea, GroupInfo
        │   ├── call/  VideoCallModal (WebRTC)
        │   ├── layout/ Sidebar
        │   └── ui/    Avatar
        ├── store/     authStore, chatStore (Zustand)
        ├── hooks/     useSocket
        ├── lib/       api (axios), socket (io)
        └── pages/     Login, Register, Chat
```
