import MessagingPage from '@/components/chat/message'
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
    <MessagingPage userId={user?.id} recipientId={slug} userRole="tutor" />
  )
}