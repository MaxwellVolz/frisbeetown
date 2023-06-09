const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const cors = require("cors");
const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } = require("wrtc");

// Serve static files from the "public" directory
app.use(express.static("public"));

// Allow requests from all origins
app.use(cors());

// Live reload
var livereload = require("livereload");
var connectLiveReload = require("connect-livereload");
const liveReloadServer = livereload.createServer();

liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
        liveReloadServer.refresh("/");
    }, 100);
});

app.use(connectLiveReload());

// Create a new socket.io namespace for WebRTC signaling
const signaling = io.of("/signaling");

// Store connected clients
let clients = {};

// Handle new socket connections
signaling.on("connection", (socket) => {
    console.log(`New signaling connection: ${socket.id}`);

    // Add the client to the list of connected clients
    clients[socket.id] = socket;

    // Send a welcome message to the client
    socket.emit("message", "Welcome to Frisbee Town Game!");

    // Broadcast a message to all connected clients (excluding the sender)
    socket.broadcast.emit("message", `${socket.id} has joined the game.`);

    const pc = new RTCPeerConnection();

    // Add event handlers for ICE candidates and incoming data channels
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            console.log(`Sending ICE candidate: ${JSON.stringify(event.candidate)}`);
            socket.emit("candidate", event.candidate);
        }
    };
    pc.ondatachannel = (event) => {
        console.log(`New data channel: ${event.channel.label}`);
        const channel = event.channel;

        // Handle incoming data messages
        channel.onmessage = (event) => {
            console.log(`Received message from ${socket.id}: ${event.data}`);

            // Broadcast the message to all connected clients (excluding the sender)
            for (let clientId in clients) {
                if (clientId !== socket.id) {
                    clients[clientId].emit("message", `[${socket.id}]: ${event.data}`);
                }
            }
        };
    };

    // Handle incoming signaling messages
    socket.on("offer", async (description) => {
        console.log(`Received offer from ${socket.id}`);

        await pc.setRemoteDescription(new RTCSessionDescription(description));

        const answer = await pc.createAnswer();

        await pc.setLocalDescription(answer);

        socket.emit("answer", answer);
    });

    socket.on("answer", async (description) => {
        console.log(`Received answer from ${socket.id}`);

        await pc.setRemoteDescription(new RTCSessionDescription(description));
    });

    socket.on("candidate", async (candidate) => {
        console.log(`Received ICE candidate from ${socket.id}`);

        await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });

    // Handle socket disconnections
    socket.on("disconnect", () => {
        console.log(`Disconnected: ${socket.id}`);

        // Remove the client from the list of connected clients
        delete clients[socket.id];

        // Broadcast a message to all connected clients (excluding the sender)
        socket.broadcast.emit("message", `${socket.id} has left the game.`);
    });
});

// Start the server and listen for incoming connections
http.listen(3000, () => {
    console.log("Server started");
});