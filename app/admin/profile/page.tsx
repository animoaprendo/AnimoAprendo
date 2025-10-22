import Profile from '@/components/profile'
import { UserProfile } from '@clerk/nextjs'
import React from 'react'

const TuteeProfile = () => {
  return (
    <div className='m-auto w-fit'>
      <UserProfile routing='hash' />
    </div>
  )
}

export default TuteeProfile