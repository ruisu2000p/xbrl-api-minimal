import React from 'react';

type Json = Record<string, any>;

export default function JsonLd({ json }: { json: Json }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
