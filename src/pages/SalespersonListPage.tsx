import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { salespersonsApi } from '../api/salespersons.js';
import Pagination from '../components/ui/Pagination.js';
import LoadingSpinner from '../components/ui/LoadingSpinner.js';
import type { Salesperson } from '../types/index.js';

export default function SalespersonListPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Salesperson[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');

  const fetch = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p), size: '20' };
      if (keyword) params.keyword = keyword;
      const res = await salespersonsApi.list(params);
      setItems(res.data.data.items);
      setTotalPages(res.data.data.pagination.totalPages);
    } finally { setLoading(false); }
  }, [page, keyword]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">영업사원 마스터</h2>
        <button onClick={() => navigate('/salesperson/new')} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">+ 사원 등록</button>
      </div>
      <div className="flex gap-3 bg-white border rounded-lg p-4">
        <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="사원명 검색" className="flex-1 border rounded px-2 py-1 text-sm" onKeyDown={e => e.key === 'Enter' && fetch(1)} />
        <button onClick={() => { setPage(1); fetch(1); }} className="px-4 py-1.5 bg-gray-600 text-white text-sm rounded">조회</button>
      </div>
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? <LoadingSpinner /> : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>{['No','사원명','부서','직급','상급자','입사일','상태'].map(h => <th key={h} className="px-4 py-3 text-left text-gray-600">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">데이터가 없습니다</td></tr>
              ) : items.map((s, i) => (
                <tr key={s.salespersonId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{(page-1)*20+i+1}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => navigate(`/salesperson/${s.salespersonId}/edit`)} className="text-blue-600 hover:underline">{s.name}</button>
                  </td>
                  <td className="px-4 py-3">{s.department}</td>
                  <td className="px-4 py-3">{s.rank}</td>
                  <td className="px-4 py-3">{s.manager?.name ?? '-'}</td>
                  <td className="px-4 py-3">{s.hireDate}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full ${s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{s.isActive ? '재직' : '퇴직'}</span></td>
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
