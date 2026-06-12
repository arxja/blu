"use client"

import { useAuth } from "@/hooks/useAuth";
import { NAVBAR_ITEMS } from "@/lib/constants";
import Link from "next/link";

const Navbar = () => {
  const { user } = useAuth()
  return (
    <div className="fixed inset-x-0 top-4 z-50 h-16 border-none transition-all duration-700 sm:inset-x-6">
      <header className="absolute top-1/2 w-full -translate-y-1/2">
        <nav className="flex size-full items-center justify-between p-4">
          {/* Left - icon */}
          <div className="flex items-center gap-7">
            <div className="w-10 h-10 bg-red-500/50 rounded-full"> {/* ToDo: change it with actual logo */}
              Hello
            </div>
          </div>
          {/* Right - nav items & user */}
          <div className="flex flex-row gap-5">
            {/* nav items */}
            <div className="flex flex-row gap-3">
              {NAVBAR_ITEMS.map((item, idx) => (
                <Link className="" href={item.link} key={idx}>{item.name}</Link>
              ))}
            </div>
          {user 
          ? <div className="p-2 bg-blue-400"></div> 
          : <Link href="/sign-up">Login</Link>
          }
          </div>
        </nav>
      </header>
    </div>
  );
}

export default Navbar