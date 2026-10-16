import type { ReactNode } from "react";

export function PhoneFrame({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <figure className="phone-wrap">
      {label && <figcaption>{label}</figcaption>}
      <div className="phone">
        <span className="island" aria-hidden="true" />
        <div className="screen">{children}</div>
      </div>
    </figure>
  );
}
