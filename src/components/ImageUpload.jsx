import React, { useRef, useState } from 'react';
import { FaImage, FaTimes, FaUpload } from 'react-icons/fa';
import { uploadImageToCloudinary } from '../utils/cloudinary';

export default function ImageUpload({ label, value, onChange, round = false }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pick = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const url = await uploadImageToCloudinary(file);
      if (url) onChange(url);
    } catch (err) {
      setError('تعذّر رفع الصورة. جرّبي ملفاً أصغر أو صيغة jpg/png.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1.5">
      {label && <span className="text-xs font-bold">{label}</span>}
      <div className="flex items-center gap-3">
        <div
          className={`shrink-0 overflow-hidden bg-[#F7F8F6] border border-[#E5E9EC] ${round ? 'w-16 h-16 rounded-full' : 'w-24 h-16 rounded-2xl'}`}
        >
          {value
            ? <img src={value} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-[#c0c5cc]"><FaImage /></div>}
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={pick} />
          <button
            type="button"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            className="w-full px-3 py-2 rounded-xl bg-[#172B3A] text-white text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <FaUpload /> {busy ? 'جاري الرفع...' : value ? 'تغيير الصورة' : 'رفع صورة'}
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="text-[11px] font-bold text-[#9A3F32] inline-flex items-center gap-1"
            >
              <FaTimes /> إزالة
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-[11px] text-rose-600">{error}</p>}
    </div>
  );
}
