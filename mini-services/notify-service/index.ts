import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
})

// نگاشت نقش -> set از سوکت‌های وصل شده
const roleRooms = new Map<string, Set<string>>() // role -> socket ids
const userRooms = new Map<string, Set<string>>() // userId -> socket ids
const socketMeta = new Map<string, { role?: string; userId?: string }>()

function addToMap(map: Map<string, Set<string>>, key: string, socketId: string) {
  if (!map.has(key)) map.set(key, new Set())
  map.get(key)!.add(socketId)
}

function removeFromMap(map: Map<string, Set<string>>, key: string, socketId: string) {
  const set = map.get(key)
  if (set) {
    set.delete(socketId)
    if (set.size === 0) map.delete(key)
  }
}

io.on('connection', (socket) => {
  console.log(`[notify] connected: ${socket.id}`)
  socketMeta.set(socket.id, {})

  // کلاینت با نقش و userId خودش join می‌شود
  socket.on('register', (data: { role: string; userId: string }) => {
    const meta = socketMeta.get(socket.id) ?? {}
    // حذف از اتاق‌های قبلی
    if (meta.role) removeFromMap(roleRooms, meta.role, socket.id)
    if (meta.userId) removeFromMap(userRooms, meta.userId, socket.id)
    meta.role = data.role
    meta.userId = data.userId
    socketMeta.set(socket.id, meta)
    addToMap(roleRooms, data.role, socket.id)
    addToMap(userRooms, data.userId, socket.id)
    socket.join(`role:${data.role}`)
    socket.join(`user:${data.userId}`)
    console.log(`[notify] registered: ${socket.id} role=${data.role} userId=${data.userId}`)
  })

  // دریافت یک اعلان از API route و انتشار به نقش یا کاربر هدف
  socket.on('broadcast', (payload: { role?: string; userId?: string; title: string; body: string; type: string; issueId?: string }) => {
    if (payload.role) {
      io.to(`role:${payload.role}`).emit('notification', payload)
    }
    if (payload.userId) {
      io.to(`user:${payload.userId}`).emit('notification', payload)
    }
  })

  socket.on('disconnect', () => {
    const meta = socketMeta.get(socket.id)
    if (meta) {
      if (meta.role) removeFromMap(roleRooms, meta.role, socket.id)
      if (meta.userId) removeFromMap(userRooms, meta.userId, socket.id)
    }
    socketMeta.delete(socket.id)
    console.log(`[notify] disconnected: ${socket.id}`)
  })

  socket.on('error', (err) => console.error(`[notify] socket error ${socket.id}:`, err))
})

const PORT = 3003
httpServer.listen(PORT, () => {
  console.log(`[notify-service] WebSocket server running on port ${PORT}`)
})

process.on('SIGTERM', () => httpServer.close(() => process.exit(0)))
process.on('SIGINT', () => httpServer.close(() => process.exit(0)))
