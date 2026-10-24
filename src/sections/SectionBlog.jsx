import React from 'react';
import { useTheme } from '../engine/ThemeContext';
import { useSectionSkin } from './sectionSkin';

export default function SectionBlog({ settings = {} }) {
  const { posts = [], clinic } = useTheme();
  const skin = useSectionSkin();
  if (clinic?.showBlog === false) return null;
  const list = [...posts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return (
    <section id="blog" className={skin.wrap}>
      <div className={skin.inner}>
        <p className={skin.kicker} style={{ color: skin.primaryColor }}>نصائح العناية</p>
        <h2 className={skin.title}>{settings.title || 'المدونة'}</h2>
        {list.length === 0 ? (
          <p className="opacity-60 text-sm">لم تُنشر مقالات بعد.</p>
        ) : (
          <div className={skin.elegant ? 'divide-y' : 'grid grid-cols-1 md:grid-cols-3 gap-5'} style={skin.elegant ? { borderColor: skin.border } : undefined}>
            {list.map((post) => (
              <article
                key={post.id}
                className={skin.elegant ? 'py-8' : `overflow-hidden border ${skin.radius}`}
                style={skin.elegant ? undefined : { backgroundColor: skin.cardBg, borderColor: skin.border }}
              >
                {(post.imageUrl || post.image) && !skin.elegant && (
                  <div className="aspect-[16/10] overflow-hidden bg-black/5">
                    <img src={post.imageUrl || post.image} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className={skin.elegant ? '' : 'p-5'}>
                  {post.createdAt && (
                    <p className="text-[11px] opacity-40 mb-2">{new Date(post.createdAt).toLocaleDateString('ar')}</p>
                  )}
                  <h3 className={`font-bold mb-2 ${skin.elegant ? 'font-display text-3xl' : 'text-lg'}`}>{post.title}</h3>
                  {post.content && <p className="text-sm opacity-70 line-clamp-3 leading-relaxed">{post.content}</p>}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
