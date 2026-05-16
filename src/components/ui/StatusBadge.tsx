import type { ReportStatus } from '../../types/index.js';

const LABEL: Record<ReportStatus, string> = {
  DRAFT: '작성중',
  SUBMITTED: '제출완료',
  CONFIRMED: '확인완료',
  NONE: '미작성',
};

const COLOR: Record<ReportStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  CONFIRMED: 'bg-green-100 text-green-700',
  NONE: 'bg-red-100 text-red-600',
};

interface Props {
  status: ReportStatus;
}

export default function StatusBadge({ status }: Props) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${COLOR[status]}`}>
      {LABEL[status]}
    </span>
  );
}
