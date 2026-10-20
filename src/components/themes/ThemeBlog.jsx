import { withAlpha } from "./themeUtils";

export default function ThemeBlog({ posts = [], enabled, accent, variant = "beauty" }) {
  if (enabled === false) return null;
  const list = [...posts].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  const elegant = variant === "elegant";
  const minimal = variant === "minimal";

  return (
    <section id="blog" className={minimal ? "max-w-6xl mx-auto px-5 pb-20" : "px-5 pb-20"}>
      <div className={minimal ? "" : "max-w-7xl mx-auto"}>
        <p
          className="text-xs tracking-[0.3em] uppercase mb-2"
          style={{ color: elegant || !minimal ? accent : undefined, opacity: minimal ? 0.4 : 1 }}
        >
          نصائح العناية
        </p>
        <h2 className={`font-display mb-8 ${elegant ? "text-5xl" : "text-4xl"}`}>المدونة</h2>

        {list.length === 0 ? (
          <p className="opacity-60 text-sm">لم تُنشر مقالات بعد. أضيفيها من صفحة المدونة في لوحة التحكم.</p>
        ) : (
          <div className={elegant ? "divide-y" : "grid grid-cols-1 md:grid-cols-3 gap-5"} style={elegant ? { borderColor: withAlpha(accent, 0.18) } : undefined}>
            {list.map((post) => (
              <article
                key={post.id}
                className={
                  elegant
                    ? "py-8"
                    : minimal
                      ? "border-t border-stone-200 pt-6"
                      : "bg-white rounded-[1.75rem] overflow-hidden border shadow-sm"
                }
                style={!elegant && !minimal ? { borderColor: withAlpha(accent, 0.12) } : undefined}
              >
                {(post.imageUrl || post.image) && !elegant && (
                  <div className={`overflow-hidden bg-black/5 ${minimal ? "aspect-[16/9] mb-4" : "aspect-[16/10]"}`}>
                    <img src={post.imageUrl || post.image} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                <div className={elegant || minimal ? "" : "p-5"}>
                  {post.createdAt && (
                    <p className="text-[11px] opacity-40 mb-2">{new Date(post.createdAt).toLocaleDateString("ar")}</p>
                  )}
                  <h3 className={`font-bold mb-2 ${elegant ? "font-display text-3xl" : "text-lg"}`}>{post.title}</h3>
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
