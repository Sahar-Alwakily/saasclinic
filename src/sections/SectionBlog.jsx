import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaCalendarAlt } from 'react-icons/fa';
import { withAlpha } from '../components/themes/themeUtils';
import { useTheme } from '../engine/ThemeContext';
import { useSectionSkin } from './sectionSkin';

export default function SectionBlog({ settings = {} }) {
  const { posts = [], clinic, themeVariant, primaryColor } = useTheme();
  const skin = useSectionSkin();
  const { clinicId } = useParams();
  if (clinic?.showBlog === false) return null;
  const list = [...posts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 3);

  if (themeVariant !== 'beauty') {
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

  return (
    <section id="blog" className="px-2 sm:px-6 my-20" dir="rtl">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold" style={{ color: primaryColor }}>
          {settings.title || 'اكتشفي أحدث المدونات'}
        </h2>
      </div>
      {list.length === 0 ? (
        <p className="text-center text-sm text-gray-500">لم تُنشر مقالات بعد.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {list.map((blog) => (
            <div key={blog.id} className="flex flex-col items-center text-center bg-white p-4 sm:p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="w-32 h-32 sm:w-40 sm:h-40 overflow-hidden rounded-full mb-4 border-2 flex items-center justify-center" style={{ borderColor: withAlpha(primaryColor, 0.35) }}>
                {(blog.imageUrl || blog.image)
                  ? <img className="w-full h-full object-cover" src={blog.imageUrl || blog.image} alt="" />
                  : <span className="text-xs text-gray-400">مدونة</span>}
              </div>
              <h3 className="text-lg sm:text-xl font-semibold" style={{ color: primaryColor }}>{blog.title || 'بدون عنوان'}</h3>
              {blog.createdAt && (
                <div className="flex items-center text-gray-500 text-xs sm:text-sm mt-2">
                  <FaCalendarAlt className="ml-1" />
                  <span>{new Date(blog.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
              )}
              <p className="text-xs sm:text-sm text-gray-600 mt-2 line-clamp-3">
                {blog.summary || (blog.content ? `${String(blog.content).slice(0, 100)}…` : '')}
              </p>
              {clinicId && (
                <Link
                  to={`/book/${clinicId}`}
                  className="text-white text-xs px-4 py-1 sm:px-6 sm:py-2 rounded-full mt-4"
                  style={{ backgroundColor: primaryColor }}
                >
                  اقرئي المزيد
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
