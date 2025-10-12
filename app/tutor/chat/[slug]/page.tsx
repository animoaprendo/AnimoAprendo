import ChatContainer from '@/components/chat/ChatContainer'
import React from 'react'
import { currentUser } from "@clerk/nextjs/server";

export default async function TutorChat ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await currentUser();

  return (
    <ChatContainer userId={user?.id} recipientId={slug} userRole="tutor" />
  )
}