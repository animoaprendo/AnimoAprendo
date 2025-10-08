// Test script to verify that fetchUsers works correctly for tutor name fetching
// This would simulate the behavior we added to the quiz page

const testFetchUsers = async () => {
  try {
    // Test if our fetchUsers function works
    const response = await fetch('http://localhost:3002/api/users?userIds=test-user-id', {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✓ Users API is working');
      console.log('Sample response:', data);
    } else {
      console.log('✗ Users API error:', response.status);
    }
  } catch (error) {
    console.log('✗ Error testing users API:', error.message);
  }
};

// Run the test
testFetchUsers();