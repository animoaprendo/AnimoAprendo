import { SignOutButton } from '@clerk/nextjs';
import { currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';

import { FiLogOut, FiUser, FiUsers } from "react-icons/fi";
import {
  RiBookLine,
  RiCalendar2Line,
  RiDashboardLine
} from "react-icons/ri";

async function NavLinksAdmin() {
  const user = await currentUser()
  return (
    <div className='flex flex-col select-none'>
      <div className='flex items-center'>
        <ul className="group flex flex-col items-center h-screen p-2 gap-5 bg-gradient-to-b from-green-700 to-green-900 text-white transition-[width, padding] duration-500 overflow-hidden w-15 hover:w-60 hover:p-5 hover:items-stretch hover:gap-5">
          <div className="rounded-full mx-auto">
            <img
              className="rounded-full w-full max-w-20"
              alt="Tailwind CSS Navbar component"
              src={user?.imageUrl} />
          </div>
          <li className='border-b text-center transition-opacity opacity-0 group-hover:opacity-100 group-hover:block'><a className='text-nowrap'>Welcome, {user?.username}</a></li>
          <li>
            <Link href="/admin/dashboard" className='flex items-center flex-nowrap gap-2 w-fit'>
              <RiDashboardLine className='text-3xl w-fit' />
              <span className='hidden group-hover:block'>Dashboard</span>
            </Link>
          </li>
          <li>
            <Link href="/admin/subjects" className='flex items-center flex-nowrap gap-2 w-fit'>
              <RiBookLine className='text-3xl' />
              <span className='hidden group-hover:block'>Subjects</span>
            </Link>
          </li>
          <li>
            <Link href="/admin/appointments" className='flex items-center flex-nowrap gap-2 w-fit'>
              <RiCalendar2Line className='text-3xl' />
              <span className='hidden group-hover:block'>Appointments</span>
            </Link>
          </li>
          <li>
            <Link href="/admin/users" className='flex items-center flex-nowrap gap-2 w-fit'>
              <FiUsers className='text-3xl' />
              <span className='hidden group-hover:block'>Users</span>
            </Link>
          </li>
          <div className='mt-auto flex flex-col flex-nowrap gap-2 items-center group-hover:items-stretch'>
            <li>
              <Link href="/admin/profile" className='flex items-center flex-nowrap gap-2 w-fit'>
                <FiUser className='text-3xl' />
                <span className='hidden group-hover:block'>Profile</span>
              </Link>
            </li>
            <li className='flex items-center flex-nowrap gap-2 w-fit'>
              <SignOutButton><FiLogOut className='text-3xl' /></SignOutButton>
              <span className='hidden group-hover:block hover:cursor-pointer'><SignOutButton>Logout</SignOutButton></span>
            </li>
          </div>
        </ul>
      </div>
    </div>
  )
}

export default NavLinksAdmin