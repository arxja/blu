import { NAVBAR_ITEMS } from "@/lib/constants";
import { Logo } from "../features/navbar";
import { NavLinks } from "../features/navbar";
import { UserSection } from "../features/navbar";
import { ScrollController } from "../features/navbar";

export default function Navbar() {
  return (
    <ScrollController>
      <div className="h-16 border-none transition-all duration-700">
        <header className="absolute top-1/2 w-full -translate-y-1/2">
          <nav className="flex size-full items-center justify-between px-6 py-2">
            <Logo />
            <div className="flex flex-row items-center gap-6">
              <NavLinks items={NAVBAR_ITEMS} />
              <UserSection />
            </div>
          </nav>
        </header>
      </div>
    </ScrollController>
  );
}
