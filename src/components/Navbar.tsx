import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import vayucastLogo from "@/assets/vayucast-logo.png";

const navLinks = [
  { label: "Map", path: "/dashboard" },
  { label: "About Us", path: "/about" },
  { label: "Contact Us", path: "/contact" },
  { label: "Pollution Prevention", path: "/product" },
];

const Navbar = () => {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src={vayucastLogo} alt="VayuCAST" className="h-10 sm:h-12 md:h-14" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                location.pathname === link.path
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden sm:block">
            <Button size="sm" className="rounded-full px-6">Login</Button>
          </Link>
          <button
            className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-accent md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 pb-4 pt-2 md:hidden">
          <nav className="flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileOpen(false)}
                className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <Link to="/login" onClick={() => setMobileOpen(false)} className="mt-2 sm:hidden">
              <Button size="sm" className="w-full rounded-full">Login</Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;
