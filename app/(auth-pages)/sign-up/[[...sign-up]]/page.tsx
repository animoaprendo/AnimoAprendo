import { SignUp } from '@clerk/nextjs'

export default function Page() {
  return (
    <>
      <div className='flex grow lg:p-10 pb-10'>
        <div className="m-auto w-fit">
          <SignUp appearance={{
            layout: {
              logoImageUrl: '/images/AnimoAprendoGreenTransparent.png',
              logoPlacement: 'inside',
              unsafe_disableDevelopmentModeWarnings: true,
            }
          }} />
        </div>
      </div>
    </>
  )

}