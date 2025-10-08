// Test script to create a sample inquiry
async function createTestInquiry() {
  const inquiryData = {
    tuteeId: "test-user-id",
    tutorId: "test-tutor-id", 
    offeringId: "test-offering-id",
    subject: "Mathematics",
    banner: "https://9idxhts2vbwdh6hb.public.blob.vercel-storage.com/keikchoco2-O9gw3FUynxpw5S2mxxD61TTgm4E5ln.jpg",
    description: "Learn basic algebra and geometry concepts"
  };

  try {
    const response = await fetch('http://localhost:3000/api/createInquiry', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inquiryData)
    });

    const result = await response.json();
    console.log('Inquiry creation result:', result);
    return result;
  } catch (error) {
    console.error('Error creating inquiry:', error);
  }
}

// Run the test
createTestInquiry();