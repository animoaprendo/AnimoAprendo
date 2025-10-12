import ChatContainer from '@/components/chat/ChatContainer'
import React from 'react'
import { currentUser } from "@clerk/nextjs/server";

const TutorChat = async () => {
  const user = await currentUser();

  return (
    <ChatContainer userId={user?.id} userRole="tutor" />
  )
}

export default TutorChat