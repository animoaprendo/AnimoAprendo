// Test creating an inquiry directly through browser fetch
async function testCreateInquiry() {
  try {
    const response = await fetch('/api/createInquiry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tuteeId: "test-user-id",
        tutorId: "test-tutor-id", 
        offeringId: "test-offering-id",
        subject: "Mathematics",
        banner: "https://9idxhts2vbwdh6hb.public.blob.vercel-storage.com/keikchoco2-O9gw3FUynxpw5S2mxxD61TTgm4E5ln.jpg",
        description: "Learn basic algebra and geometry concepts"
      })
    });

    const result = await response.json();
    console.log('Create inquiry result:', result);
    
    // Now test fetching it
    const fetchResponse = await fetch('/api/getInquiry?tuteeId=test-user-id&tutorId=test-tutor-id&offeringId=test-offering-id');
    const fetchResult = await fetchResponse.json();
    console.log('Fetch inquiry result:', fetchResult);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testCreateInquiry();