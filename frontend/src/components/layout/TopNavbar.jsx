import ThemeDropdown from "../ThemeDropdown";
import LanguageDropdown from "../LanguageDropdown";
import UserDropdown from "../UserDropdown";

export default function TopNavbar() {
  // Check if user is authenticated
  const isAuthenticated = !!sessionStorage.getItem("auth_credentials");

  return (
    <header className="sticky top-0 z-20 bg-theme-card border-b border-theme">
      <div className="flex items-center justify-end px-6 py-3 gap-3">
        {/* Language Switcher */}
        <LanguageDropdown />

        {/* Theme Switcher */}
        <ThemeDropdown />

        {/* User Menu - Only show if authenticated */}
        {isAuthenticated && <UserDropdown />}
      </div>
    </header>
  );
}
