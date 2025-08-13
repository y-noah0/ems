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
    const eventName = event || 'notification';
    const testData = data ? JSON.parse(data) : {};

    // Prepare notification payload
    const payload = {
      id: require('crypto').randomUUID(),
      type: 'test',
      message: testMessage,
      timestamp: new Date().toISOString(),
      source: 'backend_test',
      ...testData
    };

    console.log('🚀 [TEST] Emitting notification:', {
      room: room || 'broadcast',
      event: eventName,
      payload
    });

    // Get connection count
    const connectedClients = io.engine.clientsCount;
    const allSockets = Array.from(io.sockets.sockets.values());
    
    console.log(`📊 [TEST] Connected clients: ${connectedClients}`);
    console.log(`📊 [TEST] Active sockets: ${allSockets.length}`);

    // Emit to specific room or broadcast to all
    if (room) {
      const socketsInRoom = io.sockets.adapter.rooms.get(room);
      const roomSize = socketsInRoom ? socketsInRoom.size : 0;
      
      io.to(room).emit(eventName, payload);
      console.log(`✅ [TEST] Notification sent to room: ${room} (${roomSize} clients in room)`);
      
      res.json({
        success: true,
        message: `Test notification sent to room: ${room}`,
        payload,
        target: room,
        clientsInRoom: roomSize,
        totalConnectedClients: connectedClients
      });
    } else {
      io.emit(eventName, payload);
      console.log(`✅ [TEST] Notification broadcast to all ${connectedClients} clients`);
      
      res.json({
        success: true,
        message: 'Test notification broadcast to all clients',
        payload,
        target: 'all_clients',
        totalConnectedClients: connectedClients
      });
    }

  } catch (error) {
    console.error('❌ [TEST] Error sending test notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test notification',
      error: error.message
    });
  }
});

// TEST ONLY - Get Socket.IO server information
router.get('/socket-info', (req, res) => {
  try {
    const io = getIO();
    const sockets = [];
    const rooms = {};
    
    // Collect socket information
    io.sockets.sockets.forEach((socket, id) => {
      const socketRooms = Array.from(socket.rooms);
      sockets.push({
        id,
        userId: socket.user ? socket.user._id.toString() : 'unknown',
        userRole: socket.user ? socket.user.role : 'unknown',
        userName: socket.user ? socket.user.fullName : 'unknown',
        rooms: socketRooms,
        connected: socket.connected
      });
    });

    // Collect room information
    io.sockets.adapter.rooms.forEach((sockets, roomName) => {
      rooms[roomName] = {
        name: roomName,
        size: sockets.size,
        members: Array.from(sockets)
      };
    });

    console.log('📊 [TEST] Socket info requested:', {
      totalClients: io.engine.clientsCount,
      connectedSockets: sockets.length,
      activeRooms: Object.keys(rooms).length
    });

    res.json({
      success: true,
      totalClients: io.engine.clientsCount,
      connectedSockets: sockets.length,
      sockets,
      rooms,
      serverTime: new Date().toISOString()
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

// TEST ONLY - Emit specific production events for testing
router.get('/test-production-event', (req, res) => {
  try {
    const { event, room, userId, examId, classId } = req.query;
    const io = getIO();

    let payload;
    let targetRoom;
    let eventName = event || 'exam:scheduled';

    // Create realistic payloads for different event types
    switch (eventName) {
      case 'exam:scheduled':
        payload = {
          type: 'exam_scheduled',
          examId: examId || 'test_exam_123',
          classId: classId || 'test_class_456',
          title: 'Test Mathematics Exam',
          scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          duration: 120,
          message: 'New exam scheduled: Test Mathematics Exam'
        };
        targetRoom = room || `class:${classId || 'test_class_456'}`;
        break;

      case 'submission:graded':
        payload = {
          type: 'submission_graded',
          submissionId: 'test_submission_789',
          examTitle: 'Test Mathematics Exam',
          score: 85,
          totalMarks: 100,
          grade: 'A',
          message: 'Your exam has been graded: 85/100 (A)'
        };
        targetRoom = room || `user:${userId || 'test_user_123'}`;
        break;

      case 'user:registered':
        payload = {
          type: 'user_registered',
          userId: userId || 'new_user_456',
          role: 'student',
          fullName: 'Test Student',
          message: 'New student account created: Test Student'
        };
        targetRoom = room || 'role:admin';
        break;

      case 'promotion:result':
        payload = {
          type: 'promotion_result',
          status: 'promoted',
          newClass: 'Grade 11',
          message: 'Congratulations! You have been promoted to Grade 11'
        };
        targetRoom = room || `user:${userId || 'test_student_789'}`;
        break;

      default:
        payload = {
          type: 'generic_test',
          message: `Test event: ${eventName}`,
          timestamp: new Date().toISOString()
        };
        targetRoom = room || 'role:teacher';
    }

    payload.id = require('crypto').randomUUID();
    payload.timestamp = new Date().toISOString();

    console.log(`🎯 [TEST] Emitting production event: ${eventName}`, {
      targetRoom,
      payload
    });

    // Emit the event
    io.to(targetRoom).emit(eventName, payload);

    res.json({
      success: true,
      message: `Production event ${eventName} sent to ${targetRoom}`,
      event: eventName,
      target: targetRoom,
      payload
    });

  } catch (error) {
    console.error('❌ [TEST] Error sending production event:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send production event',
      error: error.message
    });
  }
});

module.exports = router;