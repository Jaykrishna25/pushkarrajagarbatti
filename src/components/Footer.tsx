import {useState} from 'react';
import {brand, nav, type Policy} from '../data/brand';
import {products} from '../data/products';
import {useShop} from '../hooks/useShop';
import {Logo} from './Art';
import {CloseButton, Drawer} from './Drawer';
import {goTo} from './Header';

/** Set to null to remove the build credit. */
const CREDIT: string | null = 'Made by Jaykrishna Navlani';

export function Footer() {
  const {openDetail} = useShop();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const c = brand.contact;
  const hasContact = Object.values(c).some(Boolean);

  return (
    <footer id="contact" data-tone="dark" className="relative bg-ink px-4 pt-20 pb-10 text-ivory sm:px-6 md:px-[6vw] md:pt-28">
      <div className="rule-gold absolute inset-x-0 top-0 opacity-40" />
      <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo tone="light" />
          <p className="mt-5 max-w-[30ch] text-body text-ivory/60">{brand.description}</p>
        </div>

        <FooterCol title="Explore">
          {nav.slice(1).map((n) => (
            <li key={n.href}>
              <a href={n.href} onClick={(e) => goTo(e)} className="hover:text-gold">
                {n.label}
              </a>
            </li>
          ))}
        </FooterCol>

        <FooterCol title="Fragrances">
          {products.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => openDetail(p.id)} className="text-left hover:text-gold">
                {p.name}
              </button>
            </li>
          ))}
        </FooterCol>

        <FooterCol title="Contact">
          {c.email && (
            <li>
              <a href={`mailto:${c.email}`} className="hover:text-gold">
                {c.email}
              </a>
            </li>
          )}
          {c.phone && (
            <li>
              <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="hover:text-gold">
                {c.phone}
              </a>
            </li>
          )}
          {c.whatsapp && (
            <li>
              <a href={`https://wa.me/${c.whatsapp}`} target="_blank" rel="noreferrer" className="hover:text-gold">
                WhatsApp
              </a>
            </li>
          )}
          {c.address && <li className="whitespace-pre-line">{c.address}</li>}
          {c.hours && <li>{c.hours}</li>}
          {!hasContact && <li className="text-ivory/45">Contact details will be listed here.</li>}
          {brand.social.map((s) => (
            <li key={s.href}>
              <a href={s.href} target="_blank" rel="noreferrer" className="hover:text-gold">
                {s.label}
              </a>
            </li>
          ))}
        </FooterCol>
      </div>

      <div className="mt-16 flex flex-col gap-6 border-t border-ivory/10 pt-8 lg:flex-row lg:items-center lg:justify-between">
        <ul className="flex flex-wrap gap-x-6 gap-y-2 font-mono text-label text-ivory/55 uppercase">
          {brand.policies.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => setPolicy(p)} className="uppercase hover:text-ivory">
                {p.label}
              </button>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-1 font-mono text-[0.625rem] tracking-[0.12em] text-ivory/40 uppercase lg:items-end">
          <span>
            © {new Date().getFullYear()} {brand.legalName ?? brand.name}
          </span>
          {CREDIT && <span>{CREDIT}</span>}
        </div>
      </div>
      {brand.previewNotice && <p className="mt-6 max-w-[60rem] text-[0.75rem] text-ivory/40">{brand.previewNotice} Illustrations are concept artwork, not product photography.</p>}

      <Drawer open={!!policy} onClose={() => setPolicy(null)} labelledBy="policy-title">
        {policy && (
          <>
            <div className="sticky top-0 flex items-center justify-between border-b border-char/10 bg-ivory/90 px-5 py-2 backdrop-blur">
              <h2 id="policy-title" className="font-display text-[1.75rem] font-medium">
                {policy.label}
              </h2>
              <CloseButton onClick={() => setPolicy(null)} />
            </div>
            <div className="px-5 py-6 text-body whitespace-pre-line text-char/80">
              {policy.body ?? 'This policy has not been published yet. It will appear here before online orders open.'}
            </div>
          </>
        )}
      </Drawer>
    </footer>
  );
}

function FooterCol({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <div>
      <h2 className="font-mono text-label text-gold uppercase">{title}</h2>
      <ul className="mt-5 space-y-2.5 text-[0.9375rem] text-ivory/75">{children}</ul>
    </div>
  );
}
