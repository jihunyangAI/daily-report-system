import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { customersApi } from '../api/customers.js';
import Pagination from '../components/ui/Pagination.js';
import LoadingSpinner from '../components/ui/LoadingSpinner.js';
import type { Customer } from '../types/index.js';

export default function CustomerListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Customer[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [industry, setIndustry] = useState('');

  const fetch = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p), size: '20' };
      if (keyword) params.keyword = keyword;
      if (industry) params.industry = industry;
      const res = await customersApi.list(params);
      setItems(res.data.data.items);
      setTotalPages(res.data.data.pagination.totalPages);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, industry]);

  useEffect(() => { fetch(); }, [fetch]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">고객 마스터</h2>
        {user?.isManager && (
          <button onClick={() => navigate('/customer/new')} className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700">
            + 고객 등록
          </button>
        )}
      </div>

      <div className="flex gap-3 items-end bg-white border rounded-lg p-4">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">검색</label>
          <input value={keyword} onChange={e => setKeyword(e.target.value)} placeholder="회사명, 담당자명"
            className="w-full border rounded px-2 py-1 text-sm" onKeyDown={e => e.key === 'Enter' && fetch(1)} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">업종</label>
          <select value={industry} onChange={e => setIndustry(e.target.value)} className="border rounded px-2 py-1 text-sm">
            <option value="">전체</option>
            {['제조','IT','유통','서비스','기타'].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <button onClick={() => { setPage(1); fetch(1); }} className="px-4 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700">조회</button>
      </div>

      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? <LoadingSpinner /> : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['No','회사명','담당자','연락처','업종','상태'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">고객이 없습니다</td></tr>
              ) : items.map((c, i) => (
                <tr key={c.customerId} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-500">{(page-1)*20+i+1}</td>
                  <td className="px-4 py-3">
                    {user?.isManager ? (
                      <button onClick={() => navigate(`/customer/${c.customerId}/edit`)} className="text-blue-600 hover:underline">{c.companyName}</button>
                    ) : c.companyName}
                  </td>
                  <td className="px-4 py-3">{c.contactName}</td>
                  <td className="px-4 py-3">{c.phone ?? '-'}</td>
                  <td className="px-4 py-3">{c.industry ?? '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
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
