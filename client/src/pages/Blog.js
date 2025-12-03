import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { generateSEOTags, generateBreadcrumbSchema, getCanonicalUrl } from '../utils/seo';
import MultipleStructuredData from '../components/seo/StructuredData';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const Blog = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const isRTL = i18n.dir() === 'rtl';
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const dateFormatter = useMemo(
    () => new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' }),
    [locale]
  );
  const [blogs, setBlogs] = useState([]);
  const [featuredBlogs, setFeaturedBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchBlogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCategory !== 'All') {
        params.append('category', selectedCategory);
      }
      if (searchTerm) {
        params.append('search', searchTerm);
      }
      
      const response = await axios.get(`${API_URL}/blogs?${params.toString()}`);
      setBlogs(response.data.data || []);
    } catch (error) {
      console.error('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchTerm]);

  const fetchFeaturedBlogs = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/blogs/featured`);
      setFeaturedBlogs(response.data.data || []);
    } catch (error) {
      console.error('Error fetching featured blogs:', error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await axios.get(`${API_URL}/blogs/categories`);
      const cats = response.data.data || [];
      setCategories(['All', ...cats.map(c => c._id)]);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories(['All', 'Real Estate Tips', 'Market Insights', 'Investment Guide', 'Property News', 'Developer Updates', 'General']);
    }
  }, []);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  useEffect(() => {
    fetchFeaturedBlogs();
    fetchCategories();
  }, [fetchFeaturedBlogs, fetchCategories]);

  const getCategoryKey = useCallback(
    (category) =>
      category === 'All'
        ? 'all'
        : category
            .toString()
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-'),
    []
  );

  const getCategoryLabel = useCallback(
    (category) =>
      t(`blog.categories.${getCategoryKey(category)}`, {
        defaultValue: category
      }),
    [getCategoryKey, t]
  );

  const formatDate = useCallback(
    (dateString) => {
      if (!dateString) return '';
      try {
        return dateFormatter.format(new Date(dateString));
      } catch {
        return dateString;
      }
    },
    [dateFormatter]
  );

  const formatViews = useCallback(
    (views) =>
      t('blog.cards.views', {
        count: views || 0,
        formatted: numberFormatter.format(views || 0)
      }),
    [numberFormatter, t]
  );

  const getCategoryColor = (category) => {
    const colors = {
      'Real Estate Tips': 'from-blue-600 to-blue-700',
      'Market Insights': 'from-purple-600 to-purple-700',
      'Investment Guide': 'from-emerald-600 to-emerald-700',
      'Property News': 'from-orange-600 to-orange-700',
      'Developer Updates': 'from-rose-600 to-rose-700',
      'General': 'from-slate-600 to-slate-700'
    };
    return colors[category] || 'from-indigo-600 to-indigo-700';
  };

  // Generate SEO tags
  const seoTags = generateSEOTags({
    title: t('blog.metaTitle'),
    description: t('blog.metaDescription'),
    url: getCanonicalUrl('/blog'),
    locale: i18n.language === 'ar' ? 'ar' : 'en'
  });
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' }
  ]);

  return (
    <>
      <Helmet>
        <title>{seoTags.title}</title>
        <meta name="description" content={seoTags.description} />
        <link rel="canonical" href={seoTags.canonical} />
        <meta property="og:title" content={seoTags['og:title']} />
        <meta property="og:description" content={seoTags['og:description']} />
        <meta property="og:url" content={seoTags['og:url']} />
        <meta name="twitter:card" content={seoTags['twitter:card']} />
        <link rel="alternate" hrefLang="en" href={getCanonicalUrl('/blog')} />
        <link rel="alternate" hrefLang="ar" href={getCanonicalUrl('/blog')} />
      </Helmet>
      <MultipleStructuredData schemas={[breadcrumbSchema]} />

      <PageLayout showMobileNav={true}>
        <div className="min-h-screen bg-[#131c2b]" dir={i18n.dir()}>
          {/* Hero Section */}
          <section className="relative pt-20 pb-10 sm:pt-24 sm:pb-12 md:pt-28 md:pb-16 overflow-hidden">
            <div className="absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-b from-[#A88B32]/10 via-transparent to-transparent"></div>
              <div className="absolute top-20 right-20 w-64 h-64 bg-[#A88B32]/10 rounded-full blur-3xl"></div>
              <div className="absolute bottom-20 left-20 w-64 h-64 bg-[#A88B32]/10 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 relative z-10" style={{ boxSizing: 'border-box' }}>
              <div className="text-center w-full max-w-4xl mx-auto" style={{ boxSizing: 'border-box' }}>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#A88B32]"></div>
                  <p className="text-xs sm:text-sm uppercase tracking-widest text-[#A88B32] font-bold">
                    {t('blog.hero.badge')}
                  </p>
                  <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#A88B32]"></div>
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
                  {t('blog.hero.title')}
                </h1>
                <p className="text-base sm:text-lg text-gray-300 mb-6">
                  {t('blog.hero.subtitle')}
                </p>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto mb-6">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={t('blog.searchPlaceholder')}
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className={`w-full py-3 rounded-lg border-2 border-white/20 bg-white/10 text-white placeholder-gray-400 focus:border-[#A88B32] focus:outline-none focus:ring-2 focus:ring-[#A88B32]/30 backdrop-blur-sm ${isRTL ? 'pr-12 pl-4 text-right' : 'pl-12 pr-4'}`}
                    />
                    <svg
                      className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 ${isRTL ? 'left-4' : 'right-4'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Categories */}
                <div className="flex flex-wrap justify-center gap-2">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`px-4 py-2 rounded-lg font-semibold text-xs sm:text-sm uppercase tracking-wide transition-all duration-300 ${
                        selectedCategory === category
                          ? 'bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white'
                          : 'bg-white/10 text-gray-300 hover:bg-white/20 border border-white/20'
                      }`}
                    >
                      {getCategoryLabel(category)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Featured Blog Section */}
          {featuredBlogs.length > 0 && (
            <section className="w-full py-8 sm:py-10 md:py-12">
              <div className="w-full max-w-7xl mx-auto px-4 sm:px-6" style={{ boxSizing: 'border-box' }}>
                <h2 className={`text-2xl sm:text-3xl font-bold text-white mb-6 ${isRTL ? 'text-right' : ''}`}>
                  {t('blog.featured.heading')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {featuredBlogs.slice(0, 3).map((blog) => (
                  <Link
                    key={blog._id}
                    to={`/blog/${blog.slug}`}
                    className="group block w-full"
                    style={{ boxSizing: 'border-box' }}
                  >
                    <div className={`relative w-full overflow-hidden rounded-xl bg-gradient-to-br ${getCategoryColor(blog.category)} flex flex-col justify-between transform transition-all duration-300 hover:scale-105 hover:shadow-2xl`} style={{ padding: '2rem', minHeight: '320px', boxSizing: 'border-box' }}>
                      <div>
                        <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-xs font-semibold mb-4">
                          {getCategoryLabel(blog.category)}
                        </span>
                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-3 line-clamp-2">
                          {blog.title}
                        </h3>
                        <p className="text-white/90 text-sm sm:text-base mb-4 line-clamp-3">
                          {blog.excerpt}
                        </p>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 text-white/70 text-xs ${isRTL ? 'flex-row-reverse' : ''}`}>
                          <span>{formatDate(blog.publishedAt)}</span>
                          <span>{isRTL ? '\u2022' : '•'}</span>
                          <span>{formatViews(blog.views || 0)}</span>
                        </div>
                        <span className={`flex items-center gap-2 text-white font-semibold text-sm group-hover:gap-3 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
                          {t('blog.cards.readMore')}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
                </div>
              </div>
            </section>
          )}

          {/* All Blogs Section */}
          <section className="w-full py-8 sm:py-10 md:py-12 pb-12 sm:pb-16 md:pb-20">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6" style={{ boxSizing: 'border-box' }}>
              <h2 className={`text-2xl sm:text-3xl font-bold text-white mb-6 ${isRTL ? 'text-right' : ''}`}>
                {t('blog.latest.heading')}
              </h2>
              
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#A88B32]"></div>
                </div>
              ) : blogs.length === 0 ? (
                <div className="text-center py-20">
                  <svg className="w-20 h-20 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-white mb-2">{t('blog.states.emptyTitle')}</h3>
                  <p className="text-gray-400">{t('blog.states.emptySubtitle')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {blogs.map((blog) => (
                  <Link
                    key={blog._id}
                    to={`/blog/${blog.slug}`}
                    className="group block w-full"
                    style={{ boxSizing: 'border-box' }}
                  >
                    <article className="w-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-[#A88B32]/50 transition-all duration-300 hover:shadow-xl hover:shadow-[#A88B32]/10 h-full flex flex-col" style={{ boxSizing: 'border-box' }}>
                      <div className="flex-1 flex flex-col" style={{ padding: '1.75rem', boxSizing: 'border-box' }}>
                        <div className="flex-1">
                          <span className={`inline-block px-3 py-1 bg-gradient-to-r ${getCategoryColor(blog.category)} text-white rounded-full text-xs font-semibold mb-3`}>
                            {getCategoryLabel(blog.category)}
                          </span>
                          <h3 className="text-lg sm:text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-[#A88B32] transition-colors">
                            {blog.title}
                          </h3>
                          <p className="text-gray-400 text-sm mb-4 line-clamp-3">
                            {blog.excerpt}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                          <div className={`flex items-center gap-2 text-gray-500 text-xs ${isRTL ? 'flex-row-reverse' : ''}`}>
                            <span>{formatDate(blog.publishedAt)}</span>
                            <span>{isRTL ? '\u2022' : '•'}</span>
                            <span>{formatViews(blog.views || 0)}</span>
                          </div>
                          <span className={`flex items-center gap-1 text-[#A88B32] font-semibold text-sm group-hover:gap-2 transition-all ${isRTL ? 'flex-row-reverse' : ''}`}>
                            {t('blog.cards.read')}
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </span>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </PageLayout>
    </>
  );
};

export default Blog;

