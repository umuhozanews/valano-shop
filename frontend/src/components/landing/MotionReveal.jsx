import { useEffect, useRef } from "react";

export function MotionReveal({
  children,
  className = "reveal-up",
  as: Tag = "div",
  style,
  activeOnMount = false,
}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const activate = () => el.classList.add("active");

    if (activeOnMount) {
      requestAnimationFrame(activate);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          activate();
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );

    observer.observe(el);

    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.92) {
      requestAnimationFrame(activate);
    }

    return () => observer.disconnect();
  }, [activeOnMount]);

  return (
    <Tag ref={ref} className={className} style={style}>
      {children}
    </Tag>
  );
}
