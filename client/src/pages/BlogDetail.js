import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import axios from 'axios';
import PageLayout from '../components/layout/PageLayout';
import { WobbleCard } from '../components/ui/aceternity/wobble-card';
import { generateSEOTags, generateArticleSchema, generateBreadcrumbSchema, getCanonicalUrl } from '../utils/seo';
import MultipleStructuredData from '../components/seo/StructuredData';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const BlogDetail = () => {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [relatedBlogs, setRelatedBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);

  const fetchBlog = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/blogs/${slug}`);
      setBlog(response.data.data);
      
      // Fetch related blogs from the same category
      if (response.data.data.category) {
        const relatedResponse = await axios.get(`${API_URL}/blogs?category=${response.data.data.category}&limit=3`);
        const filtered = relatedResponse.data.data.filter(b => b._id !== response.data.data._id);
        setRelatedBlogs(filtered);
      }
    } catch (error) {
      console.error('Error fetching blog:', error);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchBlog();
    window.scrollTo(0, 0);
  }, [fetchBlog]);

  const handleLike = async () => {
    if (liked || !blog) return;
    
    try {
      await axios.post(`${API_URL}/blogs/${blog._id}/like`);
      setLiked(true);
      setBlog({ ...blog, likes: (blog.likes || 0) + 1 });
    } catch (error) {
      console.error('Error liking blog:', error);
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Real Estate Tips': 'bg-indigo-800',
      'Market Insights': 'bg-violet-800',
      'Investment Guide': 'bg-emerald-700',
      'Property News': 'bg-orange-700',
      'Developer Updates': 'bg-rose-700',
      'General': 'bg-slate-700'
    };
    return colors[category] || 'bg-indigo-800';
  };

  if (loading) {
    return (
      <PageLayout showMobileNav={true}>
        <div className="min-h-screen bg-[#131c2b] flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-4 border-b-4 border-[#A88B32]"></div>
        </div>
      </PageLayout>
    );
  }

  if (!blog) {
    return (
      <PageLayout showMobileNav={true}>
        <div className="min-h-screen bg-[#131c2b] flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-4">Blog Not Found</h1>
            <Link to="/blog" className="text-[#A88B32] hover:underline text-sm sm:text-base">
              Return to Blog
            </Link>
          </div>
        </div>
      </PageLayout>
    );
  }

  // Generate SEO tags
  const seoTags = generateSEOTags({
    title: `${blog.metaTitle || blog.title} | Basira Blog`,
    description: blog.metaDescription || blog.excerpt || '',
    url: getCanonicalUrl(`/blog/${blog.slug || slug}`),
    image: blog.featuredImage,
    locale: 'en'
  });
  const articleSchema = generateArticleSchema(blog);
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Blog', url: '/blog' },
    { name: blog.title, url: `/blog/${blog.slug || slug}` }
  ]);

  return (
    <>
      <Helmet>
        <title>{seoTags.title}</title>
        <meta name="description" content={seoTags.description} />
        <link rel="canonical" href={seoTags.canonical} />
        <meta property="og:title" content={seoTags['og:title']} />
        <meta property="og:description" content={seoTags['og:description']} />
        <meta property="og:image" content={seoTags['og:image']} />
        <meta property="og:url" content={seoTags['og:url']} />
        <meta property="og:type" content="article" />
        <meta name="twitter:card" content={seoTags['twitter:card']} />
        <meta name="twitter:title" content={seoTags['twitter:title']} />
        <meta name="twitter:description" content={seoTags['twitter:description']} />
        <meta name="twitter:image" content={seoTags['twitter:image']} />
      </Helmet>
      <MultipleStructuredData schemas={[articleSchema, breadcrumbSchema].filter(Boolean)} />

      <PageLayout showMobileNav={true}>

      <article className="min-h-screen bg-transparent">
        {/* Hero Section */}
        <section className="relative pt-24 pb-10 sm:pt-28 sm:pb-12 md:pt-32 md:pb-16 overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-basira-gold/8 via-transparent to-basira-gold/8"></div>
            <div className="absolute top-10 right-10 w-48 h-48 sm:top-20 sm:right-20 sm:w-64 sm:h-64 md:w-96 md:h-96 bg-basira-gold/15 rounded-full blur-3xl animate-pulse"></div>
          </div>

          <div className="container mx-auto px-4 sm:px-6 relative z-10">
            <div className="max-w-4xl mx-auto">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-2 text-xs sm:text-sm text-gray-400 mb-4 sm:mb-6 flex-wrap">
                <Link to="/" className="hover:text-[#A88B32] transition-colors">Home</Link>
                <span>/</span>
                <Link to="/blog" className="hover:text-[#A88B32] transition-colors">Blog</Link>
                <span>/</span>
                <span className="text-white line-clamp-1">{blog.title}</span>
              </nav>

              {/* Category Badge */}
              <span className={`inline-block px-3 sm:px-4 py-1.5 sm:py-2 ${getCategoryColor(blog.category)} text-white rounded-full text-xs sm:text-sm font-semibold mb-4 sm:mb-6`}>
                {blog.category}
              </span>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-heading font-bold text-white mb-4 sm:mb-6 leading-tight">
                {blog.title}
              </h1>

              {/* Meta Info */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6 text-gray-400 text-xs sm:text-sm md:text-base mb-6 sm:mb-8">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>{blog.author}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="hidden sm:inline">{new Date(blog.publishedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                  <span className="inline sm:hidden">{new Date(blog.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>{blog.views} views</span>
                </div>
              </div>

              {/* Featured Image */}
              {blog.featuredImage && (
                <div className="rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden shadow-2xl mb-8 sm:mb-10 md:mb-12">
                  <img 
                    src={blog.featuredImage} 
                    alt={blog.title}
                    className="w-full h-auto object-cover"
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Content Section */}
        <section className="container mx-auto px-4 sm:px-6 pb-10 sm:pb-12 md:pb-16 relative z-10">
          <div className="max-w-4xl mx-auto">
            {/* Article Content */}
            <div 
              className="prose prose-sm sm:prose-base md:prose-lg prose-invert max-w-none mb-8 sm:mb-10 md:mb-12 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg"
              style={{
                lineHeight: '1.8',
                fontSize: 'inherit'
              }}
            >
              <div className="text-gray-300 whitespace-pre-wrap text-sm sm:text-base" dangerouslySetInnerHTML={{ __html: blog.content }} />
            </div>

            {/* Tags */}
            {blog.tags && blog.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 sm:gap-3 mb-8 sm:mb-10 md:mb-12">
                {blog.tags.map((tag, index) => (
                  <span 
                    key={index}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-[#A88B32]/20 to-[#C09C3D]/20 text-[#A88B32] border border-[#A88B32]/30 rounded-full text-xs sm:text-sm font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Like Button */}
            <div className="flex items-center justify-center gap-4 py-6 sm:py-8 border-y border-white/10 mb-8 sm:mb-10 md:mb-12">
              <button
                onClick={handleLike}
                disabled={liked}
                className={`flex items-center gap-2 sm:gap-3 px-5 sm:px-6 md:px-8 py-3 sm:py-4 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-300 ${
                  liked 
                    ? 'bg-gradient-to-r from-[#A88B32] to-[#C09C3D] text-white shadow-lg shadow-[#A88B32]/30'
                    : 'bg-white/5 border-2 border-white/20 text-gray-300 hover:border-[#A88B32] hover:text-[#A88B32]'
                }`}
              >
                <svg 
                  className={`w-5 h-5 sm:w-6 sm:h-6 ${liked ? 'fill-current' : ''}`} 
                  fill={liked ? 'currentColor' : 'none'} 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span>{blog.likes || 0} {blog.likes === 1 ? 'Like' : 'Likes'}</span>
              </button>
            </div>

            {/* Related Properties */}
            {blog.relatedProperties && blog.relatedProperties.length > 0 && (
              <div className="mb-8 sm:mb-10 md:mb-12">
                <h3 className="text-xl sm:text-2xl font-heading font-bold text-white mb-4 sm:mb-6">Related Properties</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  {blog.relatedProperties.map((property) => (
                    <Link
                      key={property._id}
                      to={`/properties/${property._id}`}
                      className="bg-white rounded-lg sm:rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                    >
                      {property.images && property.images[0] && (
                        <img src={property.images[0]} alt={property.title} className="w-full h-40 sm:h-48 object-cover" />
                      )}
                      <div className="p-4 sm:p-6">
                        <h4 className="font-semibold text-base sm:text-lg text-gray-900 mb-2">{property.title}</h4>
                        <p className="text-purple-600 font-bold text-lg sm:text-xl">EGP {property.price?.toLocaleString()}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Related Articles */}
        {relatedBlogs.length > 0 && (
          <section className="container mx-auto px-4 sm:px-6 pb-12 sm:pb-16 md:pb-20 relative z-10">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-white mb-6 sm:mb-8 text-center">Related Articles</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
                {relatedBlogs.map((relatedBlog) => (
                  <Link
                    key={relatedBlog._id}
                    to={`/blog/${relatedBlog.slug}`}
                    className="block group"
                  >
                    <WobbleCard
                      containerClassName={`min-h-[300px] sm:min-h-[350px] ${getCategoryColor(relatedBlog.category)} cursor-pointer transition-all duration-300 hover:scale-[1.02]`}
                    >
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <span className="inline-block px-2.5 sm:px-3 py-1 bg-white/20 backdrop-blur-sm text-white rounded-full text-xs font-medium mb-2 sm:mb-3">
                            {relatedBlog.category}
                          </span>
                          <h3 className="text-lg sm:text-xl font-bold text-white mb-2 sm:mb-3">
                            {relatedBlog.title}
                          </h3>
                          <p className="text-white/90 text-xs sm:text-sm line-clamp-2 sm:line-clamp-3">
                            {relatedBlog.excerpt}
                          </p>
                        </div>
                        <div className="inline-flex items-center gap-2 bg-white text-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-semibold group-hover:bg-white/90 transition-all duration-300 w-fit mt-3 sm:mt-4 text-xs sm:text-sm">
                          Read More
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </WobbleCard>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="container mx-auto px-4 sm:px-6 pb-12 sm:pb-16 md:pb-20 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-[#A88B32] to-[#C09C3D] rounded-2xl sm:rounded-3xl p-6 sm:p-8 md:p-12 text-center shadow-2xl">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-bold text-white mb-3 sm:mb-4">
                Looking for Your Dream Property?
              </h2>
              <p className="text-white/90 text-sm sm:text-base md:text-lg mb-6 sm:mb-8">
                Explore thousands of properties across Egypt
              </p>
              <Link
                to="/properties"
                className="inline-flex items-center gap-2 bg-white text-black px-5 sm:px-6 md:px-8 py-3 sm:py-3.5 md:py-4 rounded-full font-bold text-sm sm:text-base md:text-lg hover:bg-white/90 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Browse Properties
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </article>
      </PageLayout>
    </>
  );
};

export default BlogDetail;

