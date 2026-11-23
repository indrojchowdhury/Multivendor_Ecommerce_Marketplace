
import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

function MainLayout() {
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const section = document.getElementById(
        decodeURIComponent(location.hash.slice(1))
      );
      section?.scrollIntoView();
      return;
    }

    window.scrollTo(0, 0);
  }, [location.hash, location.pathname]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}

export default MainLayout;
