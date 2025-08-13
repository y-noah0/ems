const io = require('socket.io-client');
const readline = require('readline');

// Configuration
const SERVER_URL = 'http://localhost:5000';
const TEST_TOKEN = process.env.TEST_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY4OTVlMGUzYzNkYmMwM2U0NGIxNTc0YSIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzU0OTIyMDIwLCJleHAiOjE3NTUwMDg0MjB9.0wDKcVxX6Z4eBXFFq5ZfCEwD9lzom7HYDRnBL0Dzl7A.eyJpZCI6IjY4OTVlMGUzYzNkYmMwM2U0NGIxNTc0YSIsInJvbGUiOiJzdHVkZW50IiwiaWF0IjoxNzU0OTIxNDAxLCJleHAiOjE3NTUwMDc4MDF9.45Uv416Z9WJ9BRPfdPpbFtFykxHP0JFF2sMWPOKCgYc';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Create readline interface for interactive commands
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

class SocketTestClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.rooms = [];
    this.messageCount = 0;
  }

  // Initialize socket connection
  connect() {
    console.log(`${colors.cyan}🔌 Connecting to Socket.IO server at ${SERVER_URL}...${colors.reset}`);
    
    this.socket = io(SERVER_URL, {
      auth: {
        token: TEST_TOKEN
      },
      transports: ['websocket', 'polling'],
      timeout: 5000,
      forceNew: true
    });

    this.setupEventListeners();
  }

  // Setup all event listeners
  setupEventListeners() {
    // Connection events
    this.socket.on('connect', () => {
      this.connected = true;
      console.log(`${colors.green}✅ Connected to server!${colors.reset}`);
      console.log(`${colors.yellow}📋 Socket ID: ${this.socket.id}${colors.reset}`);
      this.showHelp();
      this.startInteractiveMode();
    });

    this.socket.on('connect_error', (error) => {
      console.log(`${colors.red}❌ Connection failed: ${error.message}${colors.reset}`);
      console.log(`${colors.yellow}💡 Make sure your backend server is running and JWT token is valid${colors.reset}`);
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.log(`${colors.red}🔌 Disconnected: ${reason}${colors.reset}`);
    });

    // Authentication events
    this.socket.on('error', (error) => {
      console.log(`${colors.red}🚨 Socket Error: ${error}${colors.reset}`);
    });

    // Room events
    this.socket.on('room:joined', (data) => {
      console.log(`${colors.green}🏠 Joined room: ${data.room}${colors.reset}`);
      if (!this.rooms.includes(data.room)) {
        this.rooms.push(data.room);
      }
    });

    // Notification events
    this.socket.on('notification', (data) => {
      this.messageCount++;
      console.log(`${colors.bright}${colors.magenta}📧 [${this.messageCount}] NOTIFICATION RECEIVED:${colors.reset}`);
      console.log(`${colors.cyan}   Message: ${data.message}${colors.reset}`);
      console.log(`${colors.yellow}   Type: ${data.type}${colors.reset}`);
      console.log(`${colors.yellow}   Time: ${data.timestamp}${colors.reset}`);
      if (data.id) console.log(`${colors.yellow}   ID: ${data.id}${colors.reset}`);
      if (Object.keys(data).length > 4) {
        console.log(`${colors.yellow}   Data: ${JSON.stringify(data, null, 2)}${colors.reset}`);
      }
      console.log(''); // Empty line for readability
    });

    // Production event listeners
    const productionEvents = [
      'user:registered',
      'auth:login',
      'exam:scheduled',
      'exam:updated',
      'exam:cancelled',
      'submission:received',
      'submission:graded',
      'enrollment:confirmed',
      'student:joined',
      'promotion:started',
      'promotion:result',
      'class:created',
      'class:updated',
      'class:deleted',
      'term:created',
      'term:updated',
      'term:deleted',
      'staff:created',
      'user:updated',
      'user:deleted',
      'password:reset'
    ];

    productionEvents.forEach(event => {
      this.socket.on(event, (data) => {
        this.messageCount++;
        console.log(`${colors.bright}${colors.green}🎯 [${this.messageCount}] PRODUCTION EVENT: ${event.toUpperCase()}${colors.reset}`);
        console.log(`${colors.cyan}   Message: ${data.message || 'No message'}${colors.reset}`);
        console.log(`${colors.yellow}   Time: ${data.timestamp || new Date().toISOString()}${colors.reset}`);
        console.log(`${colors.yellow}   Data: ${JSON.stringify(data, null, 2)}${colors.reset}`);
        console.log(''); // Empty line for readability
      });
    });

    // Ping/Pong for health check
    this.socket.on('pong', (data) => {
      console.log(`${colors.blue}🏓 Pong received: ${JSON.stringify(data)}${colors.reset}`);
    });
  }

  // Show available commands
  showHelp() {
    console.log(`\n${colors.bright}📋 Available Commands:${colors.reset}`);
    console.log(`${colors.cyan}  join <room>     ${colors.reset}- Join a specific room`);
    console.log(`${colors.cyan}  rooms           ${colors.reset}- Show current rooms`);
    console.log(`${colors.cyan}  ping            ${colors.reset}- Send ping to server`);
    console.log(`${colors.cyan}  status          ${colors.reset}- Show connection status`);
    console.log(`${colors.cyan}  clear           ${colors.reset}- Clear screen`);
    console.log(`${colors.cyan}  help            ${colors.reset}- Show this help`);
    console.log(`${colors.cyan}  quit            ${colors.reset}- Exit the client`);
    console.log(`\n${colors.yellow}💡 Test URLs (visit in browser):${colors.reset}`);
    console.log(`${colors.cyan}  http://localhost:5000/api/test/test-notification?message=Hello${colors.reset}`);
    console.log(`${colors.cyan}  http://localhost:5000/api/test/test-notification?room=user:123&message=Private${colors.reset}`);
    console.log(`${colors.cyan}  http://localhost:5000/api/test/socket-info${colors.reset}`);
    console.log(`${colors.cyan}  http://localhost:5000/api/test/test-production-event?event=exam:scheduled${colors.reset}\n`);
  }

  // Start interactive command mode
  startInteractiveMode() {
    const prompt = () => {
      rl.question(`${colors.green}socket-test> ${colors.reset}`, (input) => {
        this.handleCommand(input.trim());
        if (this.connected) {
          prompt();
        }
      });
    };
    prompt();
  }

  // Handle user commands
  handleCommand(input) {
    const [command, ...args] = input.split(' ');

    switch (command.toLowerCase()) {
      case 'join':
        if (args.length === 0) {
          console.log(`${colors.red}❌ Usage: join <room>${colors.reset}`);
          console.log(`${colors.yellow}💡 Example: join user:123${colors.reset}`);
        } else {
          const room = args.join(' ');
          this.joinRoom(room);
        }
        break;

      case 'rooms':
        this.showRooms();
        break;

      case 'ping':
        this.sendPing();
        break;

      case 'status':
        this.showStatus();
        break;

      case 'clear':
        console.clear();
        this.showHelp();
        break;

      case 'help':
        this.showHelp();
        break;

      case 'quit':
      case 'exit':
        this.disconnect();
        break;

      case '':
        // Empty command, do nothing
        break;

      default:
        console.log(`${colors.red}❌ Unknown command: ${command}${colors.reset}`);
        console.log(`${colors.yellow}💡 Type 'help' for available commands${colors.reset}`);
    }
  }

  // Join a room
  joinRoom(room) {
    if (!this.connected) {
      console.log(`${colors.red}❌ Not connected to server${colors.reset}`);
      return;
    }

    console.log(`${colors.cyan}🏠 Joining room: ${room}${colors.reset}`);
    this.socket.emit('join', room);
  }

  // Show current rooms
  showRooms() {
    console.log(`${colors.bright}🏠 Current Rooms:${colors.reset}`);
    if (this.rooms.length === 0) {
      console.log(`${colors.yellow}   No rooms joined yet${colors.reset}`);
    } else {
      this.rooms.forEach(room => {
        console.log(`${colors.cyan}   - ${room}${colors.reset}`);
      });
    }
  }

  // Send ping to server
  sendPing() {
    if (!this.connected) {
      console.log(`${colors.red}❌ Not connected to server${colors.reset}`);
      return;
    }

    console.log(`${colors.blue}🏓 Sending ping...${colors.reset}`);
    this.socket.emit('ping', (response) => {
      console.log(`${colors.blue}🏓 Ping response: ${JSON.stringify(response)}${colors.reset}`);
    });
  }

  // Show connection status
  showStatus() {
    console.log(`${colors.bright}📊 Connection Status:${colors.reset}`);
    console.log(`${colors.cyan}   Connected: ${this.connected ? 'Yes' : 'No'}${colors.reset}`);
    console.log(`${colors.cyan}   Socket ID: ${this.socket ? this.socket.id : 'N/A'}${colors.reset}`);
    console.log(`${colors.cyan}   Rooms: ${this.rooms.length}${colors.reset}`);
    console.log(`${colors.cyan}   Messages Received: ${this.messageCount}${colors.reset}`);
  }

  // Disconnect from server
  disconnect() {
    console.log(`${colors.yellow}👋 Disconnecting...${colors.reset}`);
    if (this.socket) {
      this.socket.disconnect();
    }
    rl.close();
    process.exit(0);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log(`\n${colors.yellow}👋 Received SIGINT, shutting down gracefully...${colors.reset}`);
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log(`\n${colors.yellow}👋 Received SIGTERM, shutting down gracefully...${colors.reset}`);
  process.exit(0);
});

// Start the test client
console.log(`${colors.bright}🧪 Socket.IO Test Client${colors.reset}`);
console.log(`${colors.yellow}⚠️  Make sure to set your JWT token in TEST_TOKEN environment variable${colors.reset}`);
console.log(`${colors.yellow}💡 Or edit the TEST_TOKEN constant in this file${colors.reset}\n`);

const client = new SocketTestClient();
client.connect();