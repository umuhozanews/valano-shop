const PRODUCT_IMAGES = {
  "Men Plain T-Shirt": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80",
  "Women Floral Dress": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&auto=format&fit=crop&q=80",
  "Men Slim Jeans": "https://images.unsplash.com/photo-1542272604-780c36856842?w=400&auto=format&fit=crop&q=80",
  "Men Casual Jacket": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&auto=format&fit=crop&q=80",
  "Women Blouse": "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400&auto=format&fit=crop&q=80",
  "Sugar 1kg": "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=400&auto=format&fit=crop&q=80",
  "Cooking Oil 1L": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80",
  "Soap Bar": "https://images.unsplash.com/photo-1607006482602-70c0daed67f6?w=400&auto=format&fit=crop&q=80",
  "Rice 1kg": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80",
};

const CATEGORY_FALLBACK_IMAGES = {
  "T-Shirts": "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=400&auto=format&fit=crop&q=80",
  "Dresses": "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=400&auto=format&fit=crop&q=80",
  "Jeans": "https://images.unsplash.com/photo-1542272604-780c36856842?w=400&auto=format&fit=crop&q=80",
  "Jackets": "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&auto=format&fit=crop&q=80",
  "Shirts": "https://images.unsplash.com/photo-1564257631407-4deb1f99d992?w=400&auto=format&fit=crop&q=80",
  "Groceries": "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80",
  "Hygiene": "https://images.unsplash.com/photo-1607006482602-70c0daed67f6?w=400&auto=format&fit=crop&q=80",
};

export function getProductImage(item) {
  if (item?.image_url) return item.image_url;
  if (item?.name && PRODUCT_IMAGES[item.name]) return PRODUCT_IMAGES[item.name];
  if (item?.category && CATEGORY_FALLBACK_IMAGES[item.category]) return CATEGORY_FALLBACK_IMAGES[item.category];
  return "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=400&auto=format&fit=crop&q=80";
}
