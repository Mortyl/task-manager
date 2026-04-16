const { createServer } = require("http");
const { parse } = require("url");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    path: "/api/socket",
    addTrailingSlash: false,
    cors: { origin: "*", methods: ["GET", "POST"] },
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("join-board", (boardId) => {
      socket.join(`board:${boardId}`);
    });

    socket.on("leave-board", (boardId) => {
      socket.leave(`board:${boardId}`);
    });

    socket.on("card:created", (data) => {
      socket.to(`board:${data.boardId}`).emit("card:created", data);
    });

    socket.on("card:updated", (data) => {
      socket.to(`board:${data.boardId}`).emit("card:updated", data);
    });

    socket.on("card:deleted", (data) => {
      socket.to(`board:${data.boardId}`).emit("card:deleted", data);
    });

    socket.on("card:moved", (data) => {
      socket.to(`board:${data.boardId}`).emit("card:moved", data);
    });

    socket.on("column:created", (data) => {
      socket.to(`board:${data.boardId}`).emit("column:created", data);
    });

    socket.on("column:updated", (data) => {
      socket.to(`board:${data.boardId}`).emit("column:updated", data);
    });

    socket.on("column:deleted", (data) => {
      socket.to(`board:${data.boardId}`).emit("column:deleted", data);
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  const port = process.env.PORT || 3000;
  httpServer.listen(port, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
