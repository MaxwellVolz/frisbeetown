const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const { RTCPeerConnection, RTCSessionDescription } = require("wrtc");

// Serve static files from the "public" directory
app.use(express.static("public"));

// Create a new socket.io namespace for WebRTC signaling
const signaling = io.of("/signaling");

// Handle new socket connections
signaling.on("connection", (socket) => {
    console.log(`New signaling connection: ${socket.id}`);

    // Create a new RTCPeerConnection object for this connection
    const pc = new RTCPeerConnection();

    // Add event handlers for ICE candidates and incoming data channels
    pc.onicecandidate = (event) => {
        if (event.candidate) {
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
            channel.send(`[${socket.id}]: ${event.data}`);
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
    });
});

// Start the server and listen for incoming connections
http.listen(3000, () => {
    console.log("Server started");
});
