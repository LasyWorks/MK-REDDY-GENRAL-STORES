import { SITE_NAME, SITE_URL, SITE_DESCRIPTION } from "./seo";

export function generateOrganization() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": SITE_URL,
    name: SITE_NAME,
    alternateName: "MK Reddy General Stores - Online Grocery",
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    image: `${SITE_URL}og-image.png`,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}logo.png`,
      width: 200,
      height: 60,
    },
    areaServed: {
      "@type": "Place",
      name: "India",
      areaServed: ["Telangana", "Andhra Pradesh"],
    },
    priceRange: "INR",
    servesCuisine: ["Grocery", "Fresh Produce", "Household Items"],
    sameAs: [
      "https://www.facebook.com/mkreddygeneralstores",
      "https://www.instagram.com/mkreddygeneralstores",
      "https://www.youtube.com/@mkreddygeneralstores",
    ],
    contactPoint: {
      "@type": "CustomerService",
      contactType: "Customer Service",
      email: "support@mkreddygeneralstore.com",
      availableLanguage: ["en", "te"],
    },
  };
}

export function generateLocalBusinessSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    image: `${SITE_URL}og-image.png`,
    priceRange: "INR",
    areaServed: "India",
    telephone: "+91-XXXXXXXXXX",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "06:00",
        closes: "23:00",
      },
    ],
  };
}

export function generateProductSchema(product, imageUrl) {
  const rating = product.rating || 4.5;
  const reviewCount = product.review_count || 100;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${SITE_URL}products/${product.id}`,
    name: product.name,
    description: product.description || product.name,
    image: imageUrl || `${SITE_URL}product-placeholder.png`,
    brand: {
      "@type": "Brand",
      name: product.brand || SITE_NAME,
    },
    category: product.category_name || "Grocery",
    sku: product.sku || `SKU-${product.id}`,
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}products/${product.id}`,
      priceCurrency: "INR",
      price: (product.price || 0).toString(),
      priceValidUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: {
        "@type": "Organization",
        name: SITE_NAME,
        url: SITE_URL,
      },
    },
    aggregateRating:
      reviewCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: rating.toString(),
            ratingCount: reviewCount.toString(),
            bestRating: "5",
            worstRating: "1",
          }
        : undefined,
    review: product.reviews
      ? product.reviews.slice(0, 3).map((r) => ({
          "@type": "Review",
          reviewRating: {
            "@type": "Rating",
            ratingValue: r.rating || 5,
            bestRating: "5",
            worstRating: "1",
          },
          reviewBody: r.comment,
          author: {
            "@type": "Person",
            name: r.author || "Customer",
          },
          datePublished: r.date || new Date().toISOString(),
        }))
      : undefined,
  };
}

export function generateBreadcrumbSchema(breadcrumbs) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((item, index) => ({
      "@type": "ListItem",
      position: (index + 1).toString(),
      name: item.name,
      item: `${SITE_URL}${item.url}`,
    })),
  };
}

export function generateProductCollectionSchema(title, description, products, url) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description: description,
    url: `${SITE_URL}${url}`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: products.slice(0, 10).map((product, index) => ({
        "@type": "ListItem",
        position: (index + 1).toString(),
        item: {
          "@type": "Product",
          "@id": `${SITE_URL}products/${product.id}`,
          name: product.name,
          image: product.image || `${SITE_URL}product-placeholder.png`,
          offers: {
            "@type": "Offer",
            price: (product.price || 0).toString(),
            priceCurrency: "INR",
          },
        },
      })),
    },
  };
}

export function generateFAQSchema(faqs) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function generateSearchActionSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}products?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

export function generateAggregateOfferSchema(products) {
  const prices = products
    .map((p) => p.price)
    .filter((p) => typeof p === "number");
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const offerCount = products.length;

  return {
    "@context": "https://schema.org",
    "@type": "AggregateOffer",
    offerCount: offerCount.toString(),
    priceCurrency: "INR",
    lowPrice: minPrice.toString(),
    highPrice: maxPrice.toString(),
    seller: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}
