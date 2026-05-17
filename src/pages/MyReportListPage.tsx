// src/pages/MyReportListPage.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { reportsApi } from '../api/reports.js';
import StatusBadge from '../components/ui/StatusBadge.js';
import Pagination from '../components/ui/Pagination.js';
import LoadingSpinner from '../components/ui/LoadingSpinner.js';
import ErrorMessage from '../components/ui/ErrorMessage.js';
import type { ReportListItem, ReportStatus } from '../types/index.js';

/** 현재 월의 1일을 YYYY-MM-DD 형식으로 반환 */
const getFirstDayOfMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

/** 오늘 날짜를 YYYY-MM-DD 형식으로 반환 */
const getTodayDate = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** datetime 문자열을 "YYYY-MM-DD HH:MM" 형식으로 변환 */
const formatDateTime = (dt: string | null): string => {
  if (!dt) return '-';
  // "2026-05-14T17:55:00" → "2026-05-14 17:55"
  return dt.slice(0, 16).replace('T', ' ');
};

export default function MyReportListPage() {
  const navigate = useNavigate();

  const [items, setItems] = useState<ReportListItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // 검색 폼 상태 (적용 전 입력값)
  const [startDateInput, setStartDateInput] = useState(getFirstDayOfMonth());
  const [endDateInput, setEndDateInput] = useState(getTodayDate());
  const [statusInput, setStatusInput] = useState('');

  // 실제 조회에 사용되는 확정 파라미터 (조회 버튼 클릭 시 갱신)
  const [appliedParams, setAppliedParams] = useState({
    startDate: getFirstDayOfMonth(),
    endDate: getTodayDate(),
    status: '',
  });

  const loadReports = useCallback(async (targetPage: number) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params: Record<string, string> = {
        page: String(targetPage),
        size: '20',
        startDate: appliedParams.startDate,
        endDate: appliedParams.endDate,
      };
      if (appliedParams.status) {
        params.status = appliedParams.status;
      }
      const res = await reportsApi.list(params);
      setItems(res.data.data.items);
      setTotalPages(res.data.data.pagination.totalPages);
    } catch {
      setErrorMsg('보고서 목록을 불러오는 데 실패했습니다. 다시 시도해 주세요.');
      setItems([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [appliedParams]);

  // appliedParams 또는 page 변경 시 목록 재조회
  useEffect(() => {
    loadReports(page);
  }, [appliedParams, page, loadReports]);

  /** 조회 버튼 클릭: 파라미터를 확정하고 1페이지로 초기화 */
  const handleSearch = () => {
    setAppliedParams({
      startDate: startDateInput,
      endDate: endDateInput,
      status: statusInput,
    });
    // page가 이미 1이면 useEffect가 발동하지 않으므로 직접 fetch
    if (page === 1) {
      loadReports(1);
    } else {
      setPage(1);
    }
  };

  /** 페이지 변경 핸들러 — page 상태 변경 → useEffect 가 loadReports 호출 */
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  /**
   * + 보고서 작성 버튼 클릭
   *
   * 처리 순서:
   * 1. 오늘 날짜로 POST /reports 시도
   * 2. 성공(201) → 편집 페이지로 이동
   * 3. 409 REPORT_ALREADY_EXISTS → 기존 보고서로 이동
   *    - DRAFT: 편집 페이지
   *    - SUBMITTED/CONFIRMED: 상세 페이지
   * 4. 기타 오류 → 에러 메시지 표시
   *
   * 주의: 현재 로드된 items로 먼저 체크하면 필터/페이지 상태에 따라
   * 목록에 없는 오늘 보고서를 놓칠 수 있으므로 API 응답을 기준으로 처리한다.
   */
  const handleCreate = async () => {
    setCreating(true);
    setErrorMsg(null);
    try {
      const res = await reportsApi.create(getTodayDate());
      navigate(`/report/${res.data.data.reportId}/edit`);
    } catch (err: unknown) {
      // Axios 에러 구조 타입
      type AxiosLike = {
        response?: {
          data?: {
            error?: {
              code?: string;
              data?: { reportId?: number };
            };
          };
        };
      };
      const error = err as AxiosLike;
      const apiError = error?.response?.data?.error;

      if (apiError?.code === 'REPORT_ALREADY_EXISTS' && apiError?.data?.reportId) {
        const existingId = apiError.data.reportId;
        // 기존 보고서 상태 확인: items에 있으면 활용, 없으면 상세 페이지로 무조건 이동
        const existing = items.find(r => r.reportId === existingId);
        if (existing?.status === 'DRAFT') {
          navigate(`/report/${existingId}/edit`);
        } else {
          // SUBMITTED, CONFIRMED이거나 목록에 없는 경우 → 상세로 이동
          navigate(`/report/${existingId}`);
        }
      } else {
        setErrorMsg('보고서 생성에 실패했습니다. 잠시 후 다시 시도해 주세요.');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">나의 일일보고 목록</h2>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
          aria-label="오늘 보고서 작성"
        >
          {creating ? '처리 중...' : '+ 보고서 작성'}
        </button>
      </div>

      {/* 전역 에러 메시지 */}
      {errorMsg && (
        <ErrorMessage
          message={errorMsg}
          onRetry={() => {
            setErrorMsg(null);
            loadReports(page);
          }}
        />
      )}

      {/* 검색 조건 */}
      <fieldset className="bg-white border rounded-lg p-4">
        <legend className="sr-only">보고서 검색 조건</legend>
        <div className="flex gap-3 items-end flex-wrap">
          <div>
            <label htmlFor="startDate" className="block text-xs text-gray-500 mb-1">
              조회기간 시작일
            </label>
            <input
              id="startDate"
              type="date"
              value={startDateInput}
              onChange={e => setStartDateInput(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
              aria-label="조회 시작일"
            />
          </div>
          <span className="text-gray-400 mb-1" aria-hidden="true">~</span>
          <div>
            <label htmlFor="endDate" className="block text-xs text-gray-500 mb-1">
              조회기간 종료일
            </label>
            <input
              id="endDate"
              type="date"
              value={endDateInput}
              onChange={e => setEndDateInput(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
              aria-label="조회 종료일"
            />
          </div>
          <div>
            <label htmlFor="statusFilter" className="block text-xs text-gray-500 mb-1">
              상태
            </label>
            <select
              id="statusFilter"
              value={statusInput}
              onChange={e => setStatusInput(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="">전체</option>
              <option value="DRAFT">작성중</option>
              <option value="SUBMITTED">제출완료</option>
              <option value="CONFIRMED">확인완료</option>
            </select>
          </div>
          <button
            onClick={handleSearch}
            className="px-4 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
          >
            조회
          </button>
        </div>
      </fieldset>

      {/* 목록 테이블 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        {loading ? (
          <div className="py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <table className="min-w-full text-sm" aria-label="나의 일일보고 목록">
            <caption className="sr-only">나의 일일보고 목록 — 보고일자, 방문건수, 상태, 제출일시</caption>
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-gray-600 font-medium w-16">
                  No
                </th>
                <th scope="col" className="px-4 py-3 text-left text-gray-600 font-medium">
                  보고일자
                </th>
                <th scope="col" className="px-4 py-3 text-left text-gray-600 font-medium">
                  방문건수
                </th>
                <th scope="col" className="px-4 py-3 text-left text-gray-600 font-medium">
                  상태
                </th>
                <th scope="col" className="px-4 py-3 text-left text-gray-600 font-medium">
                  제출일시
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <svg
                        className="w-10 h-10"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <p className="text-sm">해당 기간에 작성된 보고서가 없습니다.</p>
                      <p className="text-xs">
                        조회 기간이나 상태 필터를 변경하거나, 오늘 보고서를 새로 작성하세요.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((r, i) => (
                  <tr key={r.reportId} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-gray-500">
                      {(page - 1) * 20 + i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => navigate(`/report/${r.reportId}`)}
                        className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded"
                        aria-label={`${r.reportDate} 보고서 상세 보기`}
                      >
                        {r.reportDate}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.visitCount}건
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status as ReportStatus} />
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {formatDateTime(r.submittedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 페이지네이션 */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
