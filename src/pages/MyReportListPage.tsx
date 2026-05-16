import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsApi } from '../api/reports.js';
import StatusBadge from '../components/ui/StatusBadge.js';
import Pagination from '../components/ui/Pagination.js';
import LoadingSpinner from '../components/ui/LoadingSpinner.js';
import type { ReportListItem, ReportStatus } from '../types/index.js';

const firstDayOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const today = () => new Date().toISOString().slice(0, 10);

export default function MyReportListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ReportListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(today());
  const [status, setStatus] = useState('');

  const fetch = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p), size: '20', startDate, endDate };
      if (status) params.status = status;
      const res = await reportsApi.list(params);
      setItems(res.data.data.items);
      setTotalPages(res.data.data.pagination.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, startDate, endDate, status]);

  useEffect(() => { fetch(); }, [fetch]);

  const handleCreate = async () => {
    const t = today();
    const existing = items.find(r => r.reportDate === t);
    if (existing) {
      alert('오늘 날짜 보고서가 이미 존재합니다');
      navigate(existing.status === 'DRAFT' ? `/report/${existing.reportId}/edit` : `/report/${existing.reportId}`);
      return;
    }
    try {
      const res = await reportsApi.create(t);
      navigate(`/report/${res.data.data.reportId}/edit`);
    } catch (e: unknown) {
      const code = (e as { response?: { data?: { error?: { code?: string; data?: { reportId: number } } } } })?.response?.data?.error;
      if (code?.code === 'REPORT_ALREADY_EXISTS' && code.data?.reportId) {
        navigate(`/report/${code.data.reportId}/edit`);
      } else {
        alert('보고서 생성에 실패했습니다');
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">나의 일일보고 목록</h2>
        <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
          + 보고서 작성
        </button>
      </div>

      {/* 검색 */}
      <div className="flex gap-3 items-end flex-wrap bg-white border rounded-lg p-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">시작일</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        </div>
        <span className="text-gray-400 mb-1">~</span>
        <div>
          <label className="block text-xs text-gray-500 mb-1">종료일</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">상태</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="">전체</option>
            <option value="DRAFT">작성중</option>
            <option value="SUBMITTED">제출완료</option>
            <option value="CONFIRMED">확인완료</option>
          </select>
        </div>
        <button onClick={() => { setPage(1); fetch(1); }} className="px-4 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">
          조회
        </button>
      </div>

      {/* 목록 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? <LoadingSpinner /> : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-gray-600">No</th>
                <th className="px-4 py-3 text-left text-gray-600">보고일자</th>
                <th className="px-4 py-3 text-left text-gray-600">방문건수</th>
                <th className="px-4 py-3 text-left text-gray-600">상태</th>
                <th className="px-4 py-3 text-left text-gray-600">제출일시</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">보고서가 없습니다</td></tr>
              ) : items.map((r, i) => (
                <tr key={r.reportId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{(page - 1) * 20 + i + 1}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/report/${r.reportId}`)}
                      className="text-blue-600 hover:underline"
                    >
                      {r.reportDate}
                    </button>
                  </td>
                  <td className="px-4 py-3">{r.visitCount}건</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status as ReportStatus} /></td>
                  <td className="px-4 py-3 text-gray-500">{r.submittedAt?.slice(0, 16).replace('T', ' ') ?? '-'}</td>
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
