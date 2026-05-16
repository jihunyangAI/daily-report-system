import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { reportsApi } from '../api/reports.js';
import StatusBadge from '../components/ui/StatusBadge.js';
import LoadingSpinner from '../components/ui/LoadingSpinner.js';
import type { ReportListItem, TeamReportListItem } from '../types/index.js';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [myReports, setMyReports] = useState<ReportListItem[]>([]);
  const [teamReports, setTeamReports] = useState<TeamReportListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const myRes = await reportsApi.list({ startDate: today, endDate: today, size: '100' });
        setMyReports(myRes.data.data.items);

        if (user?.isManager) {
          const teamRes = await reportsApi.team({ reportDate: today, size: '100' });
          setTeamReports(teamRes.data.data.items);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [today, user?.isManager]);

  const handleWriteToday = async () => {
    const existing = myReports.find(r => r.reportDate === today);
    if (existing) {
      navigate(existing.status === 'DRAFT' ? `/report/${existing.reportId}/edit` : `/report/${existing.reportId}`);
      return;
    }
    try {
      const res = await reportsApi.create(today);
      navigate(`/report/${res.data.data.reportId}/edit`);
    } catch {
      alert('보고서 생성에 실패했습니다');
    }
  };

  const statusCounts = user?.isManager
    ? {
        DRAFT: teamReports.filter(r => r.status === 'DRAFT').length,
        SUBMITTED: teamReports.filter(r => r.status === 'SUBMITTED').length,
        CONFIRMED: teamReports.filter(r => r.status === 'CONFIRMED').length,
      }
    : {
        DRAFT: myReports.filter(r => r.status === 'DRAFT').length,
        SUBMITTED: myReports.filter(r => r.status === 'SUBMITTED').length,
        CONFIRMED: myReports.filter(r => r.status === 'CONFIRMED').length,
      };

  const unsubmitted = teamReports.filter(r => r.status === 'NONE' || r.status === 'DRAFT');

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-800">대시보드</h2>

      {/* 오늘의 보고 현황 */}
      <section>
        <h3 className="text-sm font-medium text-gray-500 mb-3">오늘의 보고 현황</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: '작성중', count: statusCounts.DRAFT, color: 'bg-gray-50 border-gray-200' },
            { label: '제출완료', count: statusCounts.SUBMITTED, color: 'bg-blue-50 border-blue-200' },
            { label: '확인완료', count: statusCounts.CONFIRMED, color: 'bg-green-50 border-green-200' },
          ].map(({ label, count, color }) => (
            <div key={label} className={`border rounded-lg p-4 text-center ${color}`}>
              <p className="text-2xl font-bold text-gray-800">{count}건</p>
              <p className="text-sm text-gray-600 mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 최근 미제출 보고 (상급자) */}
      {user?.isManager && unsubmitted.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-gray-500 mb-3">최근 미제출 보고</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-600">사원명</th>
                  <th className="px-4 py-2 text-left text-gray-600">보고일자</th>
                  <th className="px-4 py-2 text-left text-gray-600">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {unsubmitted.map((r, i) => (
                  <tr
                    key={i}
                    className={`hover:bg-gray-50 ${r.reportId ? 'cursor-pointer' : ''}`}
                    onClick={() => r.reportId && navigate(`/report/${r.reportId}`)}
                  >
                    <td className="px-4 py-2">{r.salesperson.name}</td>
                    <td className="px-4 py-2">{r.reportDate}</td>
                    <td className="px-4 py-2"><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 오늘 보고서 작성하기 (영업사원) */}
      {!user?.isManager && (
        <div>
          <button
            onClick={handleWriteToday}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            오늘 보고서 작성하기
          </button>
        </div>
      )}
    </div>
  );
}
