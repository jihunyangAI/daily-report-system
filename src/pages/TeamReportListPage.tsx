import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { reportsApi } from '../api/reports.js';
import StatusBadge from '../components/ui/StatusBadge.js';
import Pagination from '../components/ui/Pagination.js';
import LoadingSpinner from '../components/ui/LoadingSpinner.js';
import type { TeamReportListItem, ReportStatus } from '../types/index.js';

export default function TeamReportListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState<TeamReportListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('');

  if (!user?.isManager) return <Navigate to="/dashboard" replace />;

  const fetch = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { reportDate, page: String(p), size: '20' };
      if (status) params.status = status;
      const res = await reportsApi.team(params);
      setItems(res.data.data.items);
      setTotalPages(res.data.data.pagination.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, reportDate, status]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">팀 일일보고 목록</h2>

      <div className="flex gap-3 items-end flex-wrap bg-white border rounded-lg p-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">보고일자</label>
          <input type="date" value={reportDate} onChange={e => setReportDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">상태</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="">전체</option>
            <option value="NONE">미작성</option>
            <option value="DRAFT">작성중</option>
            <option value="SUBMITTED">제출완료</option>
            <option value="CONFIRMED">확인완료</option>
          </select>
        </div>
        <button onClick={() => { setPage(1); fetch(1); }} className="px-4 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">조회</button>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? <LoadingSpinner /> : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">No</th>
                <th className="px-4 py-3 text-left text-gray-600">보고일자</th>
                <th className="px-4 py-3 text-left text-gray-600">사원명</th>
                <th className="px-4 py-3 text-left text-gray-600">방문건수</th>
                <th className="px-4 py-3 text-left text-gray-600">상태</th>
                <th className="px-4 py-3 text-left text-gray-600">댓글수</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">데이터가 없습니다</td></tr>
              ) : items.map((r, i) => (
                <tr key={i} className={`hover:bg-gray-50 ${r.reportId ? 'cursor-pointer' : ''}`}
                  onClick={() => r.reportId && navigate(`/report/${r.reportId}`)}>
                  <td className="px-4 py-3 text-gray-500">{(page - 1) * 20 + i + 1}</td>
                  <td className="px-4 py-3">{r.reportDate}</td>
                  <td className="px-4 py-3">{r.salesperson.name}</td>
                  <td className="px-4 py-3">{r.visitCount > 0 ? `${r.visitCount}건` : '-'}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status as ReportStatus} /></td>
                  <td className="px-4 py-3">{r.reportId ? `${r.commentCount}건` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={p => { setPage(p); fetch(p); }} />
    </div>
  );
}
