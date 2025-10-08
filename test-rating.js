const { MongoClient, ObjectId } = require('mongodb');

async function testRating() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/animoaprendo';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('main');
    const appointmentsCollection = db.collection('appointments');
    
    // Find some sample appointments to see the structure
    const appointments = await appointmentsCollection
      .find({})
      .limit(5)
      .toArray();
      
    console.log('Sample appointments:');
    appointments.forEach(apt => {
      console.log('ID:', apt._id.toString());
      console.log('Status:', apt.status);
      console.log('TutorId:', apt.tutorId);
      console.log('TuteeId:', apt.tuteeId);
      console.log('---');
    });
    
    // Test a specific appointment lookup
    if (appointments.length > 0) {
      const testId = appointments[0]._id;
      const testUserId = appointments[0].tuteeId || appointments[0].tutorId;
      
      console.log('\nTesting lookup with:');
      console.log('Appointment ID:', testId.toString());
      console.log('User ID:', testUserId);
      
      const found = await appointmentsCollection.findOne({
        _id: new ObjectId(testId),
        $or: [
          { tutorId: testUserId },
          { tuteeId: testUserId }
        ]
      });
      
      console.log('Found appointment:', found ? 'YES' : 'NO');
      if (found) {
        console.log('Status:', found.status);
        console.log('Completed?', found.status === 'completed');
      }
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.close();
  }
}

testRating();