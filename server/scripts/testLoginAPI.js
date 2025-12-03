const axios = require('axios');

const testLogin = async () => {
  try {
    const response = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@basira.com',
      password: 'admin123456'
    });
    
    console.log('✅ Login successful:', response.status);
    console.log('👤 User:', response.data.user.name);
    console.log('🔑 Role:', response.data.user.role);
    console.log('📧 Email:', response.data.user.email);
    
  } catch (error) {
    console.log('❌ Login failed:', error.response?.status || error.message);
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
  }
};

testLogin();

