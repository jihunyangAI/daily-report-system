import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { reportsApi } from '../api/reports.js';
import StatusBadge from '../components/ui/StatusBadge.js';
import LoadingSpinner from '../components/ui/LoadingSpinner.js';
import ErrorMessage from '../components/ui/ErrorMessage.js';
import type { ReportDetail } from '../types/index.js';

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);

  const loadReport = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await reportsApi.detail(parseInt(id, 10));
      setReport(res.data.data);
    } catch {
      setError('보고서를 불러오는 데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReport(); }, [id]);

  const handleConfirm = async () => {
    if (!report || !window.confirm('확인처리 하시겠습니까?')) return;
    try {
      await reportsApi.confirm(report.reportId);
      await loadReport();
    } catch {
      alert('확인처리에 실패했습니다');
    }
  };

  const handleAddComment = async (type: 'problem' | 'plan', refId: number, key: string) => {
    const content = commentInputs[key]?.trim();
    if (!content) return;
    setSubmitting(key);
    try {
      if (type === 'problem') await reportsApi.addProblemComment(refId, content);
      else await reportsApi.addPlanComment(refId, content);
      setCommentInputs(prev => ({ ...prev, [key]: '' }));
      await loadReport();
    } catch {
      alert('댓글 등록에 실패했습니다');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error || !report) return <ErrorMessage message={error || '보고서를 찾을 수 없습니다'} onRetry={loadReport} />;

  const isOwner = report.salesperson.salespersonId === user?.salespersonId;
  const canEdit = isOwner && report.status === 'DRAFT';
  const canConfirm = user?.isManager && report.status === 'SUBMITTED';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 헤더 */}
      <div className="bg-white border rounded-lg p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">일일보고 상세</h2>
              <StatusBadge status={report.status} />
            </div>
            <p className="text-sm text-gray-500">
              작성자: {report.salesperson.name} | 보고일자: {report.reportDate}
            </p>
          </div>
          <div className="flex gap-2">
            {canEdit && (
              <button onClick={() => navigate(`/report/${report.reportId}/edit`)}
                className="px-4 py-2 border border-gray-300 text-sm rounded hover:bg-gray-50">수정</button>
            )}
            {canConfirm && (
              <button onClick={handleConfirm}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700">확인처리</button>
            )}
          </div>
        </div>
      </div>

      {/* 방문기록 */}
      <section className="bg-white border rounded-lg p-5">
        <h3 className="font-medium text-gray-800 mb-3">▶ 방문기록</h3>
        {report.visits.length === 0 ? (
          <p className="text-sm text-gray-400">방문기록이 없습니다</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {['고객', '방문시각', '방문목적', '방문내용', '차기방문'].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {report.visits.map(v => (
                <tr key={v.visitId}>
                  <td className="px-3 py-2">{v.customer.companyName} {v.customer.contactName}</td>
                  <td className="px-3 py-2">{v.visitTime ?? '-'}</td>
                  <td className="px-3 py-2">{v.visitPurpose ?? '-'}</td>
                  <td className="px-3 py-2 max-w-xs truncate">{v.visitContent ?? '-'}</td>
                  <td className="px-3 py-2">{v.nextVisitDate ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 과제/상담 */}
      <section className="bg-white border rounded-lg p-5 space-y-4">
        <h3 className="font-medium text-gray-800">▶ 과제/상담 (Problem)</h3>
        {report.problems.map(p => (
          <div key={p.problemId} className="border-l-2 border-gray-200 pl-3 space-y-2">
            <p className="text-sm">{p.seq}. {p.content}</p>
            {p.comments.map(c => (
              <div key={c.commentId} className="bg-yellow-50 rounded p-2 text-xs">
                <span className="font-medium">[{c.author.name}]</span> {c.content}
                <span className="text-gray-400 ml-2">{c.createdAt.slice(0, 16).replace('T', ' ')}</span>
              </div>
            ))}
            {user?.isManager && (
              <div className="flex gap-2 mt-1">
                <input
                  type="text" placeholder="댓글 입력..."
                  value={commentInputs[`p-${p.problemId}`] ?? ''}
                  onChange={e => setCommentInputs(prev => ({ ...prev, [`p-${p.problemId}`]: e.target.value }))}
                  className="flex-1 border rounded px-2 py-1 text-xs"
                  onKeyDown={e => e.key === 'Enter' && handleAddComment('problem', p.problemId, `p-${p.problemId}`)}
                />
                <button
                  onClick={() => handleAddComment('problem', p.problemId, `p-${p.problemId}`)}
                  disabled={submitting === `p-${p.problemId}`}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                >등록</button>
              </div>
            )}
          </div>
        ))}
      </section>

      {/* 익일계획 */}
      <section className="bg-white border rounded-lg p-5 space-y-4">
        <h3 className="font-medium text-gray-800">▶ 익일계획 (Plan)</h3>
        {report.plans.map(p => (
          <div key={p.planId} className="border-l-2 border-gray-200 pl-3 space-y-2">
            <p className="text-sm">{p.seq}. {p.content}</p>
            {p.comments.map(c => (
              <div key={c.commentId} className="bg-yellow-50 rounded p-2 text-xs">
                <span className="font-medium">[{c.author.name}]</span> {c.content}
                <span className="text-gray-400 ml-2">{c.createdAt.slice(0, 16).replace('T', ' ')}</span>
              </div>
            ))}
            {user?.isManager && (
              <div className="flex gap-2 mt-1">
                <input
                  type="text" placeholder="댓글 입력..."
                  value={commentInputs[`pl-${p.planId}`] ?? ''}
                  onChange={e => setCommentInputs(prev => ({ ...prev, [`pl-${p.planId}`]: e.target.value }))}
                  className="flex-1 border rounded px-2 py-1 text-xs"
                  onKeyDown={e => e.key === 'Enter' && handleAddComment('plan', p.planId, `pl-${p.planId}`)}
                />
                <button
                  onClick={() => handleAddComment('plan', p.planId, `pl-${p.planId}`)}
                  disabled={submitting === `pl-${p.planId}`}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50"
                >등록</button>
              </div>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
