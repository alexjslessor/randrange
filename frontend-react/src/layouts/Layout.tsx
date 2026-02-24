import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import SideNav from '../components/SideNav';

export default function Layout() {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-body">
        <SideNav />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
