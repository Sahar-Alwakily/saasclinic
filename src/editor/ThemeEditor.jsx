import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ref, update } from 'firebase/database';
import { toast, ToastContainer } from 'react-toastify';
import { FaPlus, FaSave, FaExternalLinkAlt, FaArrowRight } from 'react-icons/fa';
import { database } from '../APIFirebase/firebase';
import { useClinic } from '../context/ClinicContext';
import { DRAFT_STORAGE_KEY } from '../components/themes/themeUtils';
import { createDefaultSections } from '../sections/defaultSections';
import { addableTypes, createSection, normalizeSections, sectionLabel } from './sectionCatalog';
import { buildDraftClinic } from '../utils/clinicDraft';
import { storeFromClinic } from './storeIdentity';
import SortableList from './SortableList';
import SectionSettingsPanel from './SectionSettingsPanel';
import StoreIdentityPanel from './StoreIdentityPanel';

export default function ThemeEditor({ embedded = false }) {
  const { clinicId, clinicInfo, clinicPath, hasCap } = useClinic();
  const navigate = useNavigate();
  const iframeRef = useRef(null);
  const [sections, setSections] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [store, setStore] = useState(storeFromClinic(null));
  const [rightTab, setRightTab] = useState('section');

  useEffect(() => {
    const list = normalizeSections(clinicInfo?.sections) || createDefaultSections();
    setSections(list);
    setSelectedId((prev) => prev || list[0]?.id || null);
    setStore(storeFromClinic(clinicInfo));
  }, [clinicInfo]);

  const selected = useMemo(
    () => sections.find((s) => s.id === selectedId) || null,
    [sections, selectedId],
  );

  const draftClinic = useMemo(
    () => buildDraftClinic(clinicInfo || {}, { sections, store }),
    [clinicInfo, sections, store],
  );

  const pushDraft = () => {
    if (!clinicId) return;
    const payload = { clinicId, clinic: draftClinic };
    try {
      sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      /* تجاهل حصة التخزين */
    }
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'clinic-draft', clinicId, clinic: draftClinic },
      window.location.origin,
    );
  };

  useEffect(() => {
    pushDraft();
  }, [draftClinic, clinicId]);

  const onIframeLoad = () => pushDraft();

  const patchSection = (next) => {
    setSections((list) => list.map((s) => (s.id === next.id ? next : s)));
  };

  const save = async () => {
    if (!clinicPath) return;
    setSaving(true);
    try {
      await update(ref(database, clinicPath('info')), { ...store, sections });
      toast.success('حُفظت الواجهة والأقسام');
    } catch {
      toast.error('تعذّر الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const openPreview = () => {
    pushDraft();
    window.open(`/book/${clinicId}?draft=1`, '_blank', 'noopener');
  };

  const addType = (type) => {
    const block = createSection(type);
    setSections((list) => [...list, block]);
    setSelectedId(block.id);
    setRightTab('section');
    setAddOpen(false);
  };

  if (!clinicId) return null;

  return (
    <div className="space-y-3" dir="rtl">
      {!embedded && <ToastContainer position="top-left" rtl />}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] tracking-[0.22em] uppercase text-[#4d7cff] font-semibold">واجهة العيادة</p>
          <h1 className="font-product text-2xl">محرر الأقسام</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          {!embedded && (
            <button type="button" onClick={() => navigate('/settings')} className="px-3 py-2 rounded-xl bg-[#f3efe6] text-sm font-bold flex items-center gap-2">
              <FaArrowRight /> رجوع
            </button>
          )}
          <button type="button" onClick={openPreview} className="px-3 py-2 rounded-xl bg-[#f3efe6] text-sm font-bold flex items-center gap-2">
            <FaExternalLinkAlt /> معاينة
          </button>
          <button type="button" onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-[#14121c] text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50">
            <FaSave /> {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[16rem_minmax(0,1fr)_18rem] gap-3 min-h-[70vh]">
        <aside className="saas-card p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">الأقسام</p>
            <div className="relative">
              <button type="button" onClick={() => setAddOpen((v) => !v)} className="text-xs font-bold px-2 py-1 rounded-lg bg-[#4d7cff] text-white flex items-center gap-1">
                <FaPlus /> إضافة قسم
              </button>
              {addOpen && (
                <div className="absolute left-0 top-full mt-1 z-20 w-44 rounded-xl bg-white dark:bg-[#1e1b28] border border-[#e4ddd0] shadow-lg overflow-hidden">
                  {addableTypes().map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => addType(type)}
                      className="block w-full text-right px-3 py-2 text-sm hover:bg-[#f3efe6]"
                    >
                      {sectionLabel(type)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {sections.length === 0 ? (
            <p className="text-xs text-stone-500">لا أقسام — أضيفي قسماً من الزر أعلاه.</p>
          ) : (
            <SortableList
              items={sections}
              selectedId={selectedId}
              onReorder={setSections}
              onSelect={(id) => { setSelectedId(id); setRightTab('section'); }}
              onToggle={(id) => setSections((list) => list.map((s) => (s.id === id ? { ...s, visible: s.visible === false } : s)))}
              onRemove={(id) => {
                setSections((list) => list.filter((s) => s.id !== id));
                if (selectedId === id) setSelectedId(null);
              }}
            />
          )}
        </aside>

        <section className="saas-card overflow-hidden min-h-[28rem]">
          <iframe
            ref={iframeRef}
            title="معاينة الصفحة"
            src={`/book/${clinicId}?draft=1`}
            className="w-full h-full min-h-[28rem] bg-white"
            onLoad={onIframeLoad}
          />
        </section>

        <aside className="saas-card overflow-y-auto max-h-[80vh]">
          <div className="flex border-b border-[#e4ddd0] sticky top-0 bg-white dark:bg-[#16141f] z-10">
            <button type="button" onClick={() => setRightTab('section')} className={`flex-1 py-2 text-xs font-bold ${rightTab === 'section' ? 'text-[#4d7cff] border-b-2 border-[#4d7cff]' : 'text-stone-400'}`}>
              القسم
            </button>
            <button type="button" onClick={() => setRightTab('identity')} className={`flex-1 py-2 text-xs font-bold ${rightTab === 'identity' ? 'text-[#4d7cff] border-b-2 border-[#4d7cff]' : 'text-stone-400'}`}>
              الهوية
            </button>
          </div>
          {rightTab === 'identity' ? (
            <StoreIdentityPanel
              store={store}
              setStore={setStore}
              clinicId={clinicId}
              websitePro={hasCap('websitePro')}
              marketingOn={hasCap('marketing')}
            />
          ) : (
            <SectionSettingsPanel section={selected} onChange={patchSection} />
          )}
        </aside>
      </div>
    </div>
  );
}
