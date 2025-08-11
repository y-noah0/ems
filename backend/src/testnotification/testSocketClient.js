const { io } = require("socket.io-client");

// Change this URL to your backend WebSocket address
const socket = io("http://localhost:5000", {
  transports: ["websocket"]
});

socket.on("connect", () => {
  console.log("✅ Connected to WebSocket server");

  // Join a room if your server uses rooms
  socket.emit("join", { room: "user_123" });

  console.log("📡 Joined room: user_123");
});

socket.on("notification", (data) => {
  console.log("🔔 Received notification:", data);
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected from WebSocket server");
});

// Keep script alive
setInterval(() => {}, 1000);
