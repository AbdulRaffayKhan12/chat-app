const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");
const Message = require("./Message");

dotenv.config();
const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(cors());

// ✅ Set Mongoose Options to Avoid Warnings
mongoose.set("strictQuery", false);

// ✅ Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Error:", err));

// ✅ API Route to Fetch All Messages
app.get("/api/messages", async (req, res) => {
  try {
    const messages = await Message.find().sort({ timestamp: 1 });
    console.log("📩 Fetched Messages:", messages);
    res.json(messages);
  } catch (error) {
    console.error("❌ Error Fetching Messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// ✅ API Route to Save a New Message
app.post("/api/messages", async (req, res) => {
  try {
    const { username, message } = req.body;
    const newMessage = new Message({
      username,
      message,
      timestamp: new Date(),
    });

    await newMessage.save();
    console.log("✅ Message Saved:", newMessage);
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("❌ Error Saving Message:", error);
    res.status(500).json({ error: "Failed to save message" });
  }
});

// ✅ Socket.io Events
io.on("connection", (socket) => {
  console.log(`⚡ User Connected: ${socket.id}`);

  // Load all messages for the new user
  Message.find()
    .then((messages) => {
      console.log("📨 Sending Previous Messages to User:", socket.id);
      socket.emit("load_messages", messages);
    })
    .catch((err) => console.error("❌ Error Fetching Messages:", err));

  // Handle new messages
  socket.on("send_message", async (data) => {
    try {
      console.log("📩 Received Message:", data);

      const newMessage = new Message({
        username: data.username,
        message: data.message,
        timestamp: new Date(),
      });

      await newMessage.save(); // Save message in MongoDB
      console.log("✅ Message Saved to DB:", newMessage);

      io.emit("receive_message", newMessage); // Broadcast to all clients
    } catch (err) {
      console.error("❌ Error Saving Message:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`⚡ User Disconnected: ${socket.id}`);
  });
});

// ✅ Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
