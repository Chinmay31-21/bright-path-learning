import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, Menu, X } from "lucide-react";
import { useState } from "react";
const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navLinks = [{
    name: "Home",
    path: "/"
  }, {
    name: "Courses",
    path: "/courses"
  }, {
    name: "Dashboard",
    path: "/dashboard"
  }, {
    name: "Tests",
    path: "/tests"
  }];
  const isActive = (path: string) => location.pathname === path;
  return <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-md group-hover:shadow-glow transition-shadow duration-300">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold gradient-text">Shankar Classes</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => <Link key={link.path} to={link.path} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(link.path) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                {link.name}
              </Link>)}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Log In</Link>
            </Button>
            <Button variant="gradient" size="sm" asChild>
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && <div className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-2">
              {navLinks.map(link => <Link key={link.path} to={link.path} onClick={() => setIsOpen(false)} className={`px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${isActive(link.path) ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-secondary"}`}>
                  {link.name}
                </Link>)}
              <div className="flex flex-col gap-2 pt-4 border-t border-border mt-2">
                <Button variant="outline" asChild>
                  <Link to="/login">Log In</Link>
                </Button>
                <Button variant="gradient" asChild>
                  <Link to="/signup">Get Started</Link>
                </Button>
              </div>
            </div>
          </div>}
      </div>
    </nav>;
};
export default Navbar;