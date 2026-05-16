import { useState, useEffect, type FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { customersApi } from '../api/customers.js';
import LoadingSpinner from '../components/ui/LoadingSpinner.js';

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [form, setForm] = useState({ companyName: '', contactName: '', phone: '', email: '', address: '', industry: '', memo: '', isActive: true });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isEdit) return;
    customersApi.detail(parseInt(id, 10)).then(res => {
      const c = res.data.data;
      setForm({ companyName: c.companyName, contactName: c.contactName, phone: c.phone ?? '', email: c.email ?? '', address: c.address ?? '', industry: c.industry ?? '', memo: c.memo ?? '', isActive: c.isActive });
      setLoading(false);
    });
  }, [id, isEdit]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.companyName.trim()) e.companyName = '회사명을 입력하세요';
    if (!form.contactName.trim()) e.contactName = '담당자명을 입력하세요';
    if (form.companyName.length > 200) e.companyName = '최대 200자입니다';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      const data = { ...form, phone: form.phone || null, email: form.email || null, address: form.address || null, industry: form.industry || null, memo: form.memo || null };
      if (isEdit) await customersApi.update(parseInt(id, 10), data);
      else await customersApi.create(data);
      navigate('/customer');
    } catch {
      alert('저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const field = (label: string, key: keyof typeof form, type: string = 'text', required = false) => (
    <div className="grid grid-cols-4 gap-4 items-start">
      <label className="text-sm font-medium text-gray-700 pt-2 text-right">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="col-span-3">
        <input type={type} value={form[key] as string} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
          className="w-full border rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
        {errors[key] && <p className="text-xs text-red-500 mt-1">{errors[key]}</p>}
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold mb-6">{isEdit ? '고객 수정' : '고객 등록'}</h2>
      <form onSubmit={handleSubmit} className="bg-white border rounded-lg p-6 space-y-4">
        {field('회사명', 'companyName', 'text', true)}
        {field('담당자명', 'contactName', 'text', true)}
        {field('연락처', 'phone')}
        {field('이메일', 'email', 'email')}
        {field('주소', 'address')}
        <div className="grid grid-cols-4 gap-4 items-start">
          <label className="text-sm font-medium text-gray-700 pt-2 text-right">업종</label>
          <div className="col-span-3">
            <select value={form.industry} onChange={e => setForm(f => ({ ...f, industry: e.target.value }))} className="w-full border rounded px-3 py-2 text-sm">
              <option value="">선택</option>
              {['제조','IT','유통','서비스','기타'].map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 items-start">
          <label className="text-sm font-medium text-gray-700 pt-2 text-right">메모</label>
          <textarea value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))} rows={3} className="col-span-3 border rounded px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-4 gap-4 items-center">
          <label className="text-sm font-medium text-gray-700 text-right">활성여부</label>
          <div className="col-span-3 flex gap-4">
            {[true, false].map(v => (
              <label key={String(v)} className="flex items-center gap-1.5 text-sm cursor-pointer">
                <input type="radio" checked={form.isActive === v} onChange={() => setForm(f => ({ ...f, isActive: v }))} />
                {v ? '활성' : '비활성'}
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => navigate('/customer')} className="px-5 py-2 border border-gray-300 text-sm rounded hover:bg-gray-50">취소</button>
          <button type="submit" disabled={saving} className="px-5 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50">
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>
    </div>
  );
}
