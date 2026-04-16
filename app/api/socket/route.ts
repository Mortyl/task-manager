import { NextRequest } from "next/server";
import { Server } from "socket.io";

const globalForSocket = globalThis as unknown as {
  io: Server | undefined;
};

export async function GET(req: NextRequest) {
  if (globalForSocket.io) {
    return new Response("Socket already running", { status: 200 });
  }

  const httpServer = (req as any).socket?.server;

  if (!httpServer) {
    return new Response("No server found", { status: 500 });
  }

  const io = new Server(httpServer, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  globalForSocket.io = io;

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join-board", (boardId: string) => {
      socket.join(`board:${boardId}`);
      console.log(`${socket.id} joined board:${boardId}`);
    });

    socket.on("leave-board", (boardId: string) => {
      socket.leave(`board:${boardId}`);
    });

    socket.on("card:created", (data: { boardId: string; [key: string]: any }) => {
      socket.to(`board:${data.boardId}`).emit("card:created", data);
    });

    socket.on("card:updated", (data: { boardId: string; [key: string]: any }) => {
      socket.to(`board:${data.boardId}`).emit("card:updated", data);
    });

    socket.on("card:deleted", (data: { boardId: string; cardId: string; columnId: string }) => {
      socket.to(`board:${data.boardId}`).emit("card:deleted", data);
    });

    socket.on("card:moved", (data: { boardId: string; [key: string]: any }) => {
      socket.to(`board:${data.boardId}`).emit("card:moved", data);
    });

    socket.on("column:created", (data: { boardId: string; [key: string]: any }) => {
      socket.to(`board:${data.boardId}`).emit("column:created", data);
    });

    socket.on("column:updated", (data: { boardId: string; [key: string]: any }) => {
      socket.to(`board:${data.boardId}`).emit("column:updated", data);
    });

    socket.on("column:deleted", (data: { boardId: string; columnId: string }) => {
      socket.to(`board:${data.boardId}`).emit("column:deleted", data);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  return new Response("Socket server started", { status: 200 });
}
