const jwt = require('jsonwebtoken');
const User = require('./models/User');
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to database
mongoose.connect("mongodb://localhost:27017/school-exam-system");


async function getTestToken() {
  try {
    // Find any user for testing (you can modify this to find a specific user)
    const user = await User.findOne({ role: 'student' }).limit(1);
    
    if (!user) {
      console.log('❌ No user found. Please create a user first.');
      process.exit(1);
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      "hsjklfhklajhfahsdfkajhdsfajksdf",
      { expiresIn: '24h' }
    );

    console.log('✅ Test token generated for user:');
    console.log(`   Name: ${user.fullName}`);
    console.log(`   Role: ${user.role}`);
    console.log(`   Email: ${user.email}`);
    console.log('\n📋 JWT Token:');
    console.log(token);
    console.log('\n💡 Copy this token and use it in testSocketClient.js');
    console.log('💡 Or run: TEST_TOKEN="<token>" node testSocketClient.js');

  } catch (error) {
    console.error('❌ Error generating test token:', error);
  } finally {
    mongoose.connection.close();
  }
}

getTestToken();