import { useState } from "react";
import { Package } from "lucide-react";

export default function SafeImage({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-paper via-line/40 to-paper text-primary ${className}`}>
        <Package size={26} className="text-primary/70" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt || "Product image"}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
