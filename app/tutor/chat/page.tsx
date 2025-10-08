import MessagingPage from '@/components/chat/message'
import React from 'react'
import { currentUser } from "@clerk/nextjs/server";

const TutorChat = async () => {
  const user = await currentUser();

  return (
    <MessagingPage userId={user?.id} userRole="tutor" />
  )
}

export default TutorChat