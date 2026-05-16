import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { reportsApi } from '../api/reports.js';
import { customersApi } from '../api/customers.js';
import LoadingSpinner from '../components/ui/LoadingSpinner.js';
import type { ReportDetail, Customer } from '../types/index.js';

interface VisitRow { id?: number; customerId: number | null; customerLabel: string; visitTime: string; visitPurpose: string; visitContent: string; nextVisitDate: string; }
interface TextRow  { id?: number; content: string; }

export default function ReportFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const reportId = id ? parseInt(id, 10) : null;

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(!!reportId);
  const [saving, setSaving] = useState(false);

  const [visits, setVisits]     = useState<VisitRow[]>([]);
  const [problems, setProblems] = useState<TextRow[]>([]);
  const [plans, setPlans]       = useState<TextRow[]>([]);

  // 고객 검색
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [activeVisitIdx, setActiveVisitIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!reportId) return;
    (async () => {
      const res = await reportsApi.detail(reportId);
      const r = res.data.data;
      setReport(r);
      setVisits(r.visits.map(v => ({
        id: v.visitId, customerId: v.customer.customerId,
        customerLabel: `${v.customer.companyName} ${v.customer.contactName}`,
        visitTime: v.visitTime ?? '', visitPurpose: v.visitPurpose ?? '',
        visitContent: v.visitContent ?? '', nextVisitDate: v.nextVisitDate ?? '',
      })));
      setProblems(r.problems.map(p => ({ id: p.problemId, content: p.content })));
      setPlans(r.plans.map(p => ({ id: p.planId, content: p.content })));
      setLoading(false);
    })();
  }, [reportId]);

  const searchCustomers = async (kw: string) => {
    if (!kw.trim()) { setCustomerResults([]); return; }
    const res = await customersApi.list({ keyword: kw, isActive: 'true', size: '10' });
    setCustomerResults(res.data.data.items);
  };

  const selectCustomer = (idx: number, c: Customer) => {
    setVisits(prev => prev.map((v, i) => i === idx ? { ...v, customerId: c.customerId, customerLabel: `${c.companyName} ${c.contactName}` } : v));
    setCustomerResults([]);
    setCustomerSearch('');
    setActiveVisitIdx(null);
  };

  const handleSave = async (submit = false) => {
    if (!reportId) return;
    setSaving(true);
    try {
      // 방문기록 동기화 — v.id 존재 여부로 신규/기존 구분 (임시저장 후 중복 생성 방지)
      for (const v of visits) {
        if (!v.customerId) continue;
        const payload = { customerId: v.customerId, visitTime: v.visitTime || null, visitPurpose: v.visitPurpose || null, visitContent: v.visitContent || null, nextVisitDate: v.nextVisitDate || null };
        if (v.id) await reportsApi.updateVisit(reportId, v.id, payload);
        else { const r = await reportsApi.addVisit(reportId, payload); v.id = r.data.data.visitId; }
      }
      const savedVisitIds = new Set(visits.map(v => v.id).filter(Boolean));
      for (const v of report?.visits ?? []) if (!savedVisitIds.has(v.visitId)) await reportsApi.deleteVisit(reportId, v.visitId);

      // 과제/상담 동기화
      for (const p of problems) {
        if (!p.content.trim()) continue;
        if (p.id) await reportsApi.updateProblem(reportId, p.id, { content: p.content });
        else { const r = await reportsApi.addProblem(reportId, { content: p.content }); p.id = r.data.data.problemId; }
      }
      const savedProblemIds = new Set(problems.map(p => p.id).filter(Boolean));
      for (const p of report?.problems ?? []) if (!savedProblemIds.has(p.problemId)) await reportsApi.deleteProblem(reportId, p.problemId);

      // 익일계획 동기화
      for (const p of plans) {
        if (!p.content.trim()) continue;
        if (p.id) await reportsApi.updatePlan(reportId, p.id, { content: p.content });
        else { const r = await reportsApi.addPlan(reportId, { content: p.content }); p.id = r.data.data.planId; }
      }
      const savedPlanIds = new Set(plans.map(p => p.id).filter(Boolean));
      for (const p of report?.plans ?? []) if (!savedPlanIds.has(p.planId)) await reportsApi.deletePlan(reportId, p.planId);

      if (submit) {
        await reportsApi.submit(reportId);
        navigate(`/report/${reportId}`);
      } else {
        alert('임시저장 완료');
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      alert(msg ?? '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">일일보고 {reportId ? '수정' : '작성'}</h2>
        {report && <span className="text-sm text-gray-500">보고일자: {report.reportDate}</span>}
      </div>

      {/* 방문기록 */}
      <section className="bg-white border rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">▶ 방문기록</h3>
          <button onClick={() => setVisits(v => [...v, { customerId: null, customerLabel: '', visitTime: '', visitPurpose: '', visitContent: '', nextVisitDate: '' }])}
            className="text-sm text-blue-600 hover:underline">+ 행 추가</button>
        </div>
        <div className="space-y-3">
          {visits.map((v, i) => (
            <div key={i} className="border rounded p-3 space-y-2">
              <div className="relative">
                <label className="text-xs text-gray-500">고객 *</label>
                <div className="flex gap-2">
                  <input value={activeVisitIdx === i ? customerSearch : v.customerLabel}
                    onChange={e => { setActiveVisitIdx(i); setCustomerSearch(e.target.value); searchCustomers(e.target.value); }}
                    onFocus={() => setActiveVisitIdx(i)}
                    placeholder="고객명으로 검색" className="flex-1 border rounded px-2 py-1 text-sm" />
                  <button onClick={() => setVisits(vv => vv.filter((_, j) => j !== i))} className="text-red-500 text-sm px-2">삭제</button>
                </div>
                {activeVisitIdx === i && customerResults.length > 0 && (
                  <div className="absolute z-10 bg-white border rounded shadow-md mt-1 w-full max-h-40 overflow-y-auto">
                    {customerResults.map(c => (
                      <button key={c.customerId} onClick={() => selectCustomer(i, c)}
                        className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50">
                        {c.companyName} - {c.contactName}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-500">방문시각</label>
                  <input type="time" value={v.visitTime} onChange={e => setVisits(vv => vv.map((x, j) => j === i ? { ...x, visitTime: e.target.value } : x))}
                    className="w-full border rounded px-2 py-1 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-gray-500">차기방문예정일</label>
                  <input type="date" value={v.nextVisitDate} onChange={e => setVisits(vv => vv.map((x, j) => j === i ? { ...x, nextVisitDate: e.target.value } : x))}
                    className="w-full border rounded px-2 py-1 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500">방문목적</label>
                <input value={v.visitPurpose} onChange={e => setVisits(vv => vv.map((x, j) => j === i ? { ...x, visitPurpose: e.target.value } : x))}
                  className="w-full border rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500">방문내용</label>
                <textarea value={v.visitContent} onChange={e => setVisits(vv => vv.map((x, j) => j === i ? { ...x, visitContent: e.target.value } : x))}
                  rows={2} className="w-full border rounded px-2 py-1 text-sm" />
              </div>
            </div>
          ))}
          {visits.length === 0 && <p className="text-sm text-gray-400">방문기록이 없습니다 (제출 시 1건 이상 필요)</p>}
        </div>
      </section>

      {/* 과제/상담 */}
      <section className="bg-white border rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">▶ 과제/상담 (Problem)</h3>
          <button onClick={() => setProblems(p => [...p, { content: '' }])} className="text-sm text-blue-600 hover:underline">+ 행 추가</button>
        </div>
        {problems.map((p, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <span className="text-sm text-gray-500 pt-1">{i + 1}.</span>
            <textarea value={p.content} onChange={e => setProblems(pp => pp.map((x, j) => j === i ? { ...x, content: e.target.value } : x))}
              rows={2} className="flex-1 border rounded px-2 py-1 text-sm" placeholder="내용을 입력하세요" />
            <button onClick={() => setProblems(pp => pp.filter((_, j) => j !== i))} className="text-red-500 text-sm self-start mt-1">삭제</button>
          </div>
        ))}
      </section>

      {/* 익일계획 */}
      <section className="bg-white border rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">▶ 익일계획 (Plan)</h3>
          <button onClick={() => setPlans(p => [...p, { content: '' }])} className="text-sm text-blue-600 hover:underline">+ 행 추가</button>
        </div>
        {plans.map((p, i) => (
          <div key={i} className="flex gap-2 mb-2">
            <span className="text-sm text-gray-500 pt-1">{i + 1}.</span>
            <textarea value={p.content} onChange={e => setPlans(pp => pp.map((x, j) => j === i ? { ...x, content: e.target.value } : x))}
              rows={2} className="flex-1 border rounded px-2 py-1 text-sm" placeholder="내용을 입력하세요" />
            <button onClick={() => setPlans(pp => pp.filter((_, j) => j !== i))} className="text-red-500 text-sm self-start mt-1">삭제</button>
          </div>
        ))}
      </section>

      {/* 버튼 */}
      <div className="flex justify-end gap-3">
        <button onClick={() => handleSave(false)} disabled={saving || !reportId}
          className="px-5 py-2 border border-gray-300 text-sm rounded hover:bg-gray-50 disabled:opacity-50">
          {saving ? '저장 중...' : '임시저장'}
        </button>
        <button onClick={() => handleSave(true)} disabled={saving || !reportId}
          className="px-5 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
          제출
        </button>
      </div>
    </div>
  );
}
