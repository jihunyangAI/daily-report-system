import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { salespersonsApi } from '../api/salespersons.js';
import LoadingSpinner from '../components/ui/LoadingSpinner.js';

export default function SalespersonFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({ name: '', email: '', password: '', department: '', rank: '', managerId: '', hireDate: '', isActive: true });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isEdit) return;
    salespersonsApi.detail(parseInt(id, 10)).then(res => {
      const s = res.data.data;
      setForm({ name: s.name, email: s.email, password: '', department: s.department, rank: s.rank, managerId: s.manager ? String(s.manager.salespersonId) : '', hireDate: s.hireDate, isActive: s.isActive });
      setLoading(false);
    });
  }, [id, isEdit]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = '사원명을 입력하세요';
    if (!form.email.trim()) e.email = '이메일을 입력하세요';
    if (!isEdit && form.password.length < 8) e.password = '비밀번호는 8자 이상이어야 합니다';
    if (isEdit && form.password && form.password.length < 8) e.password = '비밀번호는 8자 이상이어야 합니다';
    if (!form.department.trim()) e.department = '부서를 입력하세요';
    if (!form.rank.trim()) e.rank = '직급을 입력하세요';
    if (!form.hireDate) e.hireDate = '입사일을 입력하세요';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const data: Record<string, unknown> = { name: form.name, email: form.email, department: form.department, rank: form.rank, managerId: form.managerId ? parseInt(form.managerId, 10) : null, hireDate: form.hireDate, isActive: form.isActive };
      if (form.password) data.password = form.password;
      if (!isEdit) data.password = form.password;
      if (isEdit) await salespersonsApi.update(parseInt(id, 10), data);
      else await salespersonsApi.create(data);
      navigate('/salesperson');
    } catch (err: unknown) {
      const code = (err as { response?: { data?: { error?: { code?: string } } } })?.response?.data?.error?.code;
      if (code === 'SALESPERSON_EMAIL_DUPLICATE') alert('이미 사용 중인 이메일입니다');
      else alert('저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const field = (label: string, key: keyof typeof form, type = 'text', required = false, hint = '') => (
    <div className="grid grid-cols-4 gap-4 items-start">
      <label className="text-sm font-medium text-gray-700 pt-2 text-right">{label} {required && <span className="text-red-500">*</span>}</label>
      <div className="col-span-3">
        <input type={type} value={form[key] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={hint}
          className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-6">{isEdit ? '영업사원 수정' : '영업사원 등록'}</h2>
      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
        {field('사원명', 'name', 'text', true)}
        {field('이메일', 'email', 'email', true)}
        {field('비밀번호', 'password', 'password', !isEdit, isEdit ? '변경 시에만 입력' : '8자 이상')}
        {field('부서', 'department', 'text', true)}
        {field('직급', 'rank', 'text', true)}
        {field('상급자 ID', 'managerId', 'number', false, '상급자 salespersonId')}
        {field('입사일', 'hireDate', 'date', true)}
        <div className="grid grid-cols-4 gap-4 items-center">
          <label className="text-sm font-medium text-gray-700 text-right">재직여부</label>
          <div className="col-span-3 flex gap-4">
            {[true, false].map(v => (
              <label key={String(v)} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="radio" checked={form.isActive === v} onChange={() => setForm(f => ({ ...f, isActive: v }))} />
                {v ? '재직' : '퇴직'}
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/salesperson')} className="px-5 py-2 border border-gray-300 text-sm rounded hover:bg-gray-50">취소</button>
          <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
