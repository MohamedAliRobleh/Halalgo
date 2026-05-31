import { Routes, Route } from 'react-router-dom';
import { useAuth, SignIn } from '@clerk/clerk-react';
import { Sidebar }       from './components/Sidebar';
import { Dashboard }     from './pages/Dashboard';
import { Users }         from './pages/Users';
import { Orders }        from './pages/Orders';
import { Stores }        from './pages/Stores';
import { Drivers }       from './pages/Drivers';
import { Promotions }    from './pages/Promotions';
import { Finances }      from './pages/Finances';
import { Notifications } from './pages/Notifications';

function ProtectedLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  if (!isLoaded) return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );
  if (!isSignedIn) return (
    <div className="flex h-screen items-center justify-center">
      <SignIn />
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/"              element={<Dashboard />} />
          <Route path="/users"         element={<Users />} />
          <Route path="/orders"        element={<Orders />} />
          <Route path="/stores"        element={<Stores />} />
          <Route path="/drivers"       element={<Drivers />} />
          <Route path="/promotions"    element={<Promotions />} />
          <Route path="/finances"      element={<Finances />} />
          <Route path="/notifications" element={<Notifications />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
}
