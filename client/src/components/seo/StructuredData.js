import React from 'react';

/**
 * StructuredData Component
 * Renders JSON-LD structured data for SEO
 */
const StructuredData = ({ data }) => {
  if (!data) return null;

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
};

/**
 * MultipleStructuredData Component
 * Renders multiple JSON-LD structured data schemas
 */
export const MultipleStructuredData = ({ schemas = [] }) => {
  if (!schemas || schemas.length === 0) return null;

  return (
    <>
      {schemas
        .filter(schema => schema !== null && schema !== undefined)
        .map((schema, index) => (
          <StructuredData key={index} data={schema} />
        ))}
    </>
  );
};

export default StructuredData;

