import MessagingPage from '@/components/chat/message'
import React, { use } from 'react'

export default function TuteeChat ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  return (
    <MessagingPage />
  )
}
