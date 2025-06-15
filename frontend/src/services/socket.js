import { io } from "socket.io-client";

let socket;

export const getSocket = () => {
    if (!socket) {
        const token = localStorage.getItem("token");
        socket = io("http://localhost:5000", {
            auth: { token },
            transports: ["websocket"],
            reconnection: true,
        });
    }
    return socket;
};

export const disconnectSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};