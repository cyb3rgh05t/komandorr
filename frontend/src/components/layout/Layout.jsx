import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-theme-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col w-full md:w-auto">
        <TopNavbar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
