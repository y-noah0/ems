const express = require('express');
const router = express.Router();
const { getIO } = require('../socketServer');

// TEST ONLY - Remove before production deployment
// Test notification endpoint to verify Socket.IO functionality
router.get('/test-notification', (req, res) => {
  try {
    const { room, message, event, data } = req.query;
    const io = getIO();

    // Default values
    const testMessage = message || 'Test notification from backend';
    const eventName = event || 'test:notification';
    const testData = data ? JSON.parse(data) : {};

    // Prepare notification payload
    const payload = {
      id: require('crypto').randomUUID(),
      type: 'test',
      message: testMessage,
      timestamp: new Date().toISOString(),
      ...testData
    };

    console.log('🚀 [TEST] Emitting notification:', {
      room: room || 'broadcast',
      event: eventName,
      payload
    });

    // Emit to specific room or broadcast to all
    if (room) {
      io.to(room).emit(eventName, payload);
      console.log(`✅ [TEST] Notification sent to room: ${room}`);
    } else {
      io.emit(eventName, payload);
      console.log('✅ [TEST] Notification broadcast to all clients');
    }

    res.json({
      success: true,
      message: 'Test notification sent successfully',
      payload,
      target: room || 'all_clients',
      connectedClients: io.engine.clientsCount
    });

  } catch (error) {
    console.error('❌ [TEST] Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
});

// TEST ONLY - Get connected clients info
router.get('/socket-info', (req, res) => {
  try {
    const io = getIO();
    const sockets = [];
    
    // Get all connected sockets
    io.sockets.sockets.forEach((socket, id) => {
      sockets.push({
        id,
        userId: socket.userId || 'unknown',
        rooms: Array.from(socket.rooms),
        connected: socket.connected
      });
    });

    console.log('📊 [TEST] Socket info requested:', {
      totalClients: io.engine.clientsCount,
      connectedSockets: sockets.length
    });

    res.json({
      success: true,
      totalClients: io.engine.clientsCount,
      connectedSockets: sockets.length,
      sockets
    });

  } catch (error) {
    console.error('❌ [TEST] Error getting socket info:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get socket info',
      error: error.message
    });
  }
});

// TEST ONLY - Force join a room
router.post('/join-room', (req, res) => {
  try {
    const { socketId, room } = req.body;
    const io = getIO();
    
    if (!socketId || !room) {
      return res.status(400).json({
        success: false,
        message: 'socketId and room are required'
      });
    }

    const socket = io.sockets.sockets.get(socketId);
    if (!socket) {
      return res.status(404).json({
        success: false,
        message: 'Socket not found'
      });
    }

    socket.join(room);
    console.log(`🏠 [TEST] Socket ${socketId} joined room: ${room}`);

    res.json({
      success: true,
      message: `Socket joined room: ${room}`,
      socketId,
      room,
      currentRooms: Array.from(socket.rooms)
    });

  } catch (error) {
    console.error('❌ [TEST] Error joining room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join room',
      error: error.message
    });
  }
});

// TEST ONLY - Force leave a room
router.post('/leave-room', (req, res) => {
  try {
    const { socketId, room } = req.body;
    const io = getIO();
    
    if (!socketId || !room) {
      return res.status(400).json({
        success: false,
        message: 'socketId and room are required'
      });
    }

    const socket = io.sockets.sockets.get(socketId);
    if (!socket) {
      return res.status(404).json({
        success: false,
        message: 'Socket not found'
      });
    }

    socket.leave(room);
    console.log(`🚪 [TEST] Socket ${socketId} left room: ${room}`);

    res.json({
      success: true,
      message: `Socket left room: ${room}`,
      socketId,
      room,
      currentRooms: Array.from(socket.rooms)
    });

  } catch (error) {
    console.error('❌ [TEST] Error leaving room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave room',
      error: error.message
    });
  }
});

module.exports = router;