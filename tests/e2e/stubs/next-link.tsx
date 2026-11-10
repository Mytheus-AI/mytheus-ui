import { forwardRef, type AnchorHTMLAttributes } from "react";

// next/link without a Next router: a plain anchor that does not navigate the test page away.
const Link = forwardRef<HTMLAnchorElement, AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }>(
  function Link({ href, onClick, ...rest }, ref) {
    return (
      <a
        ref={ref}
        href={href}
        onClick={(e) => {
          onClick?.(e);
          e.preventDefault();
        }}
        {...rest}
      />
    );
  },
);
export default Link;
