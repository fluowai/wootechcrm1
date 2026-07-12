import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io: Server | null = null;

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }
  return process.env.JWT_SECRET;
}

export function initSocketManager(httpServer: HttpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.query.token as string;
    if (!token) {
      return next(new Error("Token nao fornecido"));
    }

    jwt.verify(token, getJwtSecret(), (err: any, decoded: any) => {
      if (err) {
        return next(new Error("Token invalido"));
      }
      (socket as any).user = decoded;
      next();
    });
  });

  io.on("connection", (socket) => {
    const user = (socket as any).user;
    const accountId = socket.handshake.query.accountId || user?.accountId || user?.orgId;

    console.log(`[WS] connected - user:${user?.id} org:${accountId}`);

    if (accountId) {
      socket.join(`org:${accountId}`);
    }

    socket.on("disconnect", (reason) => {
      console.log(`[WS] disconnected - user:${user?.id} reason:${reason}`);
    });

    socket.on("error", (err) => {
      console.error(`[WS] error - user:${user?.id} err:${err.message}`);
    });
  });

  console.log("[WS] Socket.io initialized");
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.io not initialized");
  }
  return io;
}

export function emitToOrganization(orgId: string, event: string, data: any) {
  if (io) {
    io.to(`org:${orgId}`).emit(event, data);
  }
}
