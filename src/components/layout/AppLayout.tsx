import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.js';
import { apiClient } from '../../api/client.js';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await apiClient.post('/auth/logout'); } catch { /* ignore */ }
    logout();
    navigate('/login');
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-2 rounded text-sm hover:bg-blue-50 ${isActive ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-700'}`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-gray-800">영업 일일보고 시스템</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-600">{user?.name}</span>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-700 underline">
            로그아웃
          </button>
        </div>
      </header>

      <div className="flex">
        {/* 좌측 메뉴 */}
        <nav className="w-48 min-h-[calc(100vh-53px)] bg-white border-r border-gray-200 p-4 space-y-1">
          <NavLink to="/dashboard" className={navLinkClass}>대시보드</NavLink>

          <div className="pt-2">
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">일일보고</p>
            <NavLink to="/report/my" className={navLinkClass}>나의 보고</NavLink>
            {user?.isManager && (
              <NavLink to="/report/team" className={navLinkClass}>팀 보고</NavLink>
            )}
          </div>

          <div className="pt-2">
            <NavLink to="/customer" className={navLinkClass}>고객관리</NavLink>
          </div>

          {user?.isManager && (
            <div className="pt-2">
              <NavLink to="/salesperson" className={navLinkClass}>사원관리</NavLink>
            </div>
          )}
        </nav>

        {/* 본문 */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
