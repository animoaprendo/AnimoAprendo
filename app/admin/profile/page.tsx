import { UserProfile } from '@clerk/nextjs'

const TuteeProfile = () => {
  return (
    <div className='m-auto w-fit'>
      <UserProfile routing='hash' />
    </div>
  )
}

export default TuteeProfile