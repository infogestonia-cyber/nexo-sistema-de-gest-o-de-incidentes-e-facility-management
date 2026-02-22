import { io } from "socket.io-client";

const socket = io(window.location.origin, {
  autoConnect: false,
});

export const connectSocket = (user: any, roomId: string = "global") => {
  socket.auth = { user };
  socket.connect();
  socket.emit("join-room", { roomId, user });
};

export const disconnectSocket = () => {
  socket.disconnect();
};

export default socket;
