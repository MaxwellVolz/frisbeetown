const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const cors = require("cors");
const { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate } = require("wrtc");

// Allow requests from all origins
app.use(cors());

// Specific origins
// app.use(cors({
//   origin: "http://localhost:58703"
// }));

// Serve static files from the "public" directory
app.use(express.static("public"));

// Create a new socket.io namespace for WebRTC signaling
const signaling = io.of("/signaling");

// Handle new socket connections
signaling.on("connection", (socket) => {
    console.log(`New signaling connection: ${socket.id}`);
    const pc = new RTCPeerConnection();
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit("candidate", event.candidate);
        }
    };
    socket.on("offer", async (description) => {
        console.log("damn")
        console.log(`Received offer from ${socket.id}`);
        await pc.setRemoteDescription(new RTCSessionDescription(description));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("answer", answer);
        console.log("Answer sent: ", answer);
    });
    socket.on("answer", async (description) => {
        console.log(`Received answer from ${socket.id}`);
        await pc.setRemoteDescription(new RTCSessionDescription(description));
    });
    socket.on("candidate", async (candidate) => {
        console.log(`Received ICE candidate from ${socket.id}`);
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
    });
});


// Start the server and listen for incoming connections
http.listen(3000, () => {
    console.log("Server started");
});
