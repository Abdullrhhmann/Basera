/**
 * SEO Utility Functions
 * Centralized SEO meta tag and structured data management
 */

const BASE_URL = process.env.REACT_APP_SITE_URL || 'https://www.basera-consultancy.com';
const SITE_NAME = 'Basera Real Estate';
const DEFAULT_IMAGE = `${BASE_URL}/logos/basiralogo.png`;
const DEFAULT_DESCRIPTION = 'Find your dream property in Egypt\'s premier real estate destinations. Explore luxury villas, apartments, and prime locations with Basera Real Estate.';

/**
 * Get canonical URL for a given path
 */
export const getCanonicalUrl = (path = '') => {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL}${cleanPath}`;
};

/**
 * Generate absolute URL from relative path
 */
export const getAbsoluteUrl = (relativePath) => {
  if (!relativePath) return DEFAULT_IMAGE;
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  const cleanPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${BASE_URL}${cleanPath}`;
};

/**
 * Generate Open Graph meta tags
 */
export const generateOpenGraphTags = ({
  title,
  description,
  image,
  url,
  type = 'website',
  siteName = SITE_NAME,
  locale = 'en_US',
  alternateLocale = 'ar_EG'
}) => {
  const ogImage = getAbsoluteUrl(image || DEFAULT_IMAGE);
  const ogUrl = url || BASE_URL;

  return {
    'og:title': title || SITE_NAME,
    'og:description': description || DEFAULT_DESCRIPTION,
    'og:image': ogImage,
    'og:image:width': '1200',
    'og:image:height': '630',
    'og:url': ogUrl,
    'og:type': type,
    'og:site_name': siteName,
    'og:locale': locale,
    'og:locale:alternate': alternateLocale
  };
};

/**
 * Generate Twitter Card meta tags
 */
export const generateTwitterCardTags = ({
  title,
  description,
  image,
  cardType = 'summary_large_image'
}) => {
  const twitterImage = getAbsoluteUrl(image || DEFAULT_IMAGE);

  return {
    'twitter:card': cardType,
    'twitter:title': title || SITE_NAME,
    'twitter:description': description || DEFAULT_DESCRIPTION,
    'twitter:image': twitterImage
  };
};

/**
 * Generate comprehensive SEO meta tags
 */
export const generateSEOTags = ({
  title,
  description,
  image,
  url,
  type = 'website',
  keywords,
  locale = 'en',
  alternateLocale = 'ar'
}) => {
  const canonicalUrl = url || BASE_URL;
  const ogTags = generateOpenGraphTags({
    title,
    description,
    image,
    url: canonicalUrl,
    type,
    locale: locale === 'ar' ? 'ar_EG' : 'en_US',
    alternateLocale: alternateLocale === 'ar' ? 'ar_EG' : 'en_US'
  });
  const twitterTags = generateTwitterCardTags({
    title,
    description,
    image
  });

  return {
    title: title || SITE_NAME,
    description: description || DEFAULT_DESCRIPTION,
    keywords: keywords || 'real estate, Egypt, properties, villas, apartments, luxury homes, Basera',
    canonical: canonicalUrl,
    ...ogTags,
    ...twitterTags
  };
};

/**
 * Generate Organization structured data
 */
export const generateOrganizationSchema = () => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': SITE_NAME,
    'url': BASE_URL,
    'logo': DEFAULT_IMAGE,
    'description': DEFAULT_DESCRIPTION,
    'sameAs': [] // Add social media links here if available
  };
};

/**
 * Generate WebSite structured data with search action
 */
export const generateWebsiteSchema = () => {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    'name': SITE_NAME,
    'url': BASE_URL,
    'potentialAction': {
      '@type': 'SearchAction',
      'target': {
        '@type': 'EntryPoint',
        'urlTemplate': `${BASE_URL}/properties?search={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };
};

/**
 * Generate BreadcrumbList structured data
 */
export const generateBreadcrumbSchema = (items) => {
  if (!items || items.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': getCanonicalUrl(item.url)
    }))
  };
};

/**
 * Generate RealEstateListing structured data
 */
export const generateRealEstateListingSchema = (property) => {
  if (!property) return null;

  const price = property.price ? {
    '@type': 'PriceSpecification',
    'price': property.price,
    'priceCurrency': property.currency || 'EGP'
  } : null;

  const addressParts = [
    property.area_ref?.name,
    property.city_ref?.name,
    property.governorate_ref?.name,
    'Egypt'
  ].filter(Boolean);

  const address = addressParts.length > 0 ? {
    '@type': 'PostalAddress',
    'addressLocality': property.city_ref?.name || '',
    'addressRegion': property.governorate_ref?.name || '',
    'addressCountry': 'EG'
  } : null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    'name': property.title || 'Property',
    'description': property.description || '',
    'url': getCanonicalUrl(`/properties/${property._id}`),
    'image': property.images && property.images.length > 0 
      ? property.images.map(img => getAbsoluteUrl(img.url))
      : [DEFAULT_IMAGE],
    'category': property.type || 'Property'
  };

  if (price) schema.priceSpecification = price;
  if (address) schema.address = address;
  if (property.specifications?.area) {
    schema.floorSize = {
      '@type': 'QuantitativeValue',
      'value': property.specifications.area,
      'unitCode': 'MTK'
    };
  }
  if (property.specifications?.bedrooms) {
    schema.numberOfBedrooms = property.specifications.bedrooms;
  }
  if (property.specifications?.bathrooms) {
    schema.numberOfBathroomsTotal = property.specifications.bathrooms;
  }

  return schema;
};

/**
 * Generate Article structured data (for blog posts)
 */
export const generateArticleSchema = (article) => {
  if (!article) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    'headline': article.title || '',
    'description': article.excerpt || article.description || '',
    'image': article.featuredImage 
      ? getAbsoluteUrl(article.featuredImage)
      : DEFAULT_IMAGE,
    'datePublished': article.publishedAt || article.createdAt || '',
    'dateModified': article.updatedAt || article.createdAt || '',
    'author': {
      '@type': 'Organization',
      'name': SITE_NAME
    },
    'publisher': {
      '@type': 'Organization',
      'name': SITE_NAME,
      'logo': {
        '@type': 'ImageObject',
        'url': DEFAULT_IMAGE
      }
    }
  };
};

const seoUtils = {
  BASE_URL,
  SITE_NAME,
  DEFAULT_IMAGE,
  DEFAULT_DESCRIPTION,
  getCanonicalUrl,
  getAbsoluteUrl,
  generateSEOTags,
  generateOpenGraphTags,
  generateTwitterCardTags,
  generateOrganizationSchema,
  generateWebsiteSchema,
  generateBreadcrumbSchema,
  generateRealEstateListingSchema,
  generateArticleSchema
};

export default seoUtils;

