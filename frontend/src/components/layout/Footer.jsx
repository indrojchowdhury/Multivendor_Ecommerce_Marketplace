
import { Link, useLocation, useNavigate } from "react-router-dom";

function Footer() {
  const location = useLocation();
  const navigate = useNavigate();

  function scrollHomeToTop(event) {
    if (location.pathname === "/") {
      event.preventDefault();
      if (location.hash || location.search) {
        navigate("/", { replace: true });
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <footer className="border-t border-[#131921] bg-[#131921] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div>
          <Link
            to="/"
            onClick={scrollHomeToTop}
            className="inline-flex"
          >
            <span className="text-xl font-black tracking-tight" aria-label="FlipBox">
              <span className="text-white">Flip</span>
              <span className="text-orange-400">Box</span>
            </span>
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-6 text-slate-300">
            Discover products from independent vendors, all in one place.
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white">Explore</h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-300">
            <li><Link className="hover:text-orange-700" to="/" onClick={scrollHomeToTop}>Home</Link></li>
            <li><Link className="hover:text-orange-700" to="/#categories">Categories</Link></li>
            <li><Link className="hover:text-orange-700" to="/wishlist">Wishlist</Link></li>
          </ul>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-white">Head office</h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <p className="leading-6 text-slate-300">Dhaka, Bangladesh</p>
            <Link
              to="/register"
              className="inline-flex font-semibold text-orange-600 hover:text-orange-700"
            >
              Become a seller
            </Link>
          </div>
        </div>
      </div>

      <div className="border-t border-slate-700">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-sm text-slate-400 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} FlipBox</p>
          <p>Discover something good, from someone local.</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
