import MessagingPage from '@/components/chat/message'
import React from 'react'
import { currentUser } from "@clerk/nextjs/server";

export default async function TuteeChat ({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ offeringId?: string }>;
}) {
  const { slug } = await params;
  const { offeringId } = await searchParams;
  const user = await currentUser();

  return (
    <MessagingPage 
      userId={user?.id || "test-user-id"} 
      recipientId={slug} 
      userRole="tutee" 
      offeringId={offeringId}
    />
  )
}
