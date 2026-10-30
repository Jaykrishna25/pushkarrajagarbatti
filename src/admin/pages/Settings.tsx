import {useEffect, useState, type ReactNode} from 'react';
import {brand, story} from '../../data/brand';
import type {SiteSettings} from '../../lib/db';
import type {AdminApi} from '../api';
import {Button, Card, Field, PageHeader, Toggle, inputCls, paiseToInput, parseRupees, useToast} from '../ui';

type Form = {
  tagline: string;
  description: string;
  legalName: string;
  showNotice: boolean;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  hours: string;
  social: {label: string; href: string}[];
  fee: string;
  freeOver: string;
  shippingPolicy: string;
  returns: string;
  privacy: string;
  terms: string;
  storyText: string;
  pullQuote: string;
};

const toForm = (s: SiteSettings, live: boolean): Form => ({
  tagline: s.tagline ?? '',
  description: s.description ?? '',
  legalName: s.legalName ?? '',
  showNotice: s.previewNotice !== undefined ? !!s.previewNotice : !live,
  email: s.contact?.email ?? '',
  phone: s.contact?.phone ?? '',
  whatsapp: s.contact?.whatsapp ?? '',
  address: s.contact?.address ?? '',
  hours: s.contact?.hours ?? '',
  social: s.social?.length ? s.social : [],
  fee: paiseToInput(s.shipping?.feePaise ?? 0),
  freeOver: paiseToInput(s.shipping?.freeOverPaise ?? null),
  shippingPolicy: s.policies?.shipping ?? '',
  returns: s.policies?.returns ?? '',
  privacy: s.policies?.privacy ?? '',
  terms: s.policies?.terms ?? '',
  storyText: (s.story?.paragraphs ?? []).join('\n\n'),
  pullQuote: s.story?.pullQuote ?? '',
});

export function Settings({api, user}: {api: AdminApi; user: string}) {
  const toast = useToast();
  const [form, setForm] = useState<Form | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [pw, setPw] = useState('');

  useEffect(() => {
    api.getSettings().then(
      (s) => setForm(toForm(s, api.mode === 'live')),
      (e: Error) => toast(e.message, 'error'),
    );
  }, [api, toast]);

  if (!form) return <p className="p-10 text-center text-char/60">Loading settings…</p>;
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({...f!, [k]: v}));

  const save = async () => {
    const e: Record<string, string> = {};
    const fee = parseRupees(form.fee || '0');
    const freeOver = form.freeOver.trim() ? parseRupees(form.freeOver) : null;
    if (fee === null) e.fee = 'Enter an amount in rupees (0 for free delivery).';
    if (form.freeOver.trim() && freeOver === null) e.freeOver = 'Enter an amount in rupees, or leave empty.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Check the email address.';
    const wa = form.whatsapp.replace(/\D/g, '');
    if (wa && !/^\d{11,13}$/.test(wa)) e.whatsapp = 'Include the country code, e.g. 919876543210.';
    form.social.forEach((l, i) => {
      if ((l.label || l.href) && !/^https:\/\//.test(l.href)) e[`social${i}`] = 'Link must start with https://';
    });
    setErrors(e);
    if (Object.keys(e).length) {
      toast('Please fix the highlighted fields.', 'error');
      return;
    }
    const s: SiteSettings = {
      tagline: form.tagline.trim() || undefined,
      description: form.description.trim() || undefined,
      legalName: form.legalName.trim() || null,
      previewNotice: form.showNotice ? (brand.previewNotice ?? 'Preview build — products and prices shown here are placeholders.') : null,
      contact: {email: form.email.trim() || null, phone: form.phone.trim() || null, whatsapp: wa || null, address: form.address.trim() || null, hours: form.hours.trim() || null},
      social: form.social.filter((l) => l.label.trim() && l.href.trim()).map((l) => ({label: l.label.trim(), href: l.href.trim()})),
      policies: {shipping: form.shippingPolicy.trim() || null, returns: form.returns.trim() || null, privacy: form.privacy.trim() || null, terms: form.terms.trim() || null},
      story: {paragraphs: form.storyText.split(/\n\s*\n/).map((x) => x.trim()).filter(Boolean), pullQuote: form.pullQuote.trim() || undefined},
      shipping: {feePaise: fee ?? 0, freeOverPaise: freeOver},
    };
    setBusy(true);
    try {
      await api.saveSettings(s);
      toast('Settings saved. The website shows them on its next load.');
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not save.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async () => {
    if (pw.length < 10) {
      toast('Use at least 10 characters.', 'error');
      return;
    }
    try {
      await api.changePassword(pw);
      setPw('');
      toast('Password changed.');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not change password.', 'error');
    }
  };

  const text = (k: keyof Form, label: string, props: {hint?: string; placeholder?: string; type?: string} = {}) => (
    <Field label={label} hint={props.hint} error={errors[k]}>
      {(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errors[k]} type={props.type ?? 'text'} value={form[k] as string} onChange={(e) => set(k, e.target.value as never)} placeholder={props.placeholder} className={inputCls} />}
    </Field>
  );
  const area = (k: keyof Form, label: string, rows = 5, hint?: string) => (
    <Field label={label} hint={hint}>
      {(id, d) => <textarea id={id} aria-describedby={d} rows={rows} value={form[k] as string} onChange={(e) => set(k, e.target.value as never)} className={inputCls} />}
    </Field>
  );

  return (
    <>
      <PageHeader
        title="Settings"
        subtitle="Business details, delivery charges, policies and your story — shown on the website."
        actions={
          <Button variant="primary" onClick={() => void save()} disabled={busy}>
            {busy ? 'Saving…' : 'Save settings'}
          </Button>
        }
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <Section title="Business">
          {text('tagline', 'Headline on the home page', {placeholder: brand.tagline})}
          {text('description', 'Short description (footer)', {placeholder: 'One line about the business'})}
          {text('legalName', 'Registered business name', {hint: 'Used in the copyright line.'})}
          <Toggle checked={form.showNotice} onChange={(v) => set('showNotice', v)} label="Show “sample data” notice" description="Turn off once your real products and prices are in." />
        </Section>

        <Section title="Contact">
          <div className="grid gap-4 sm:grid-cols-2">
            {text('email', 'Email', {type: 'email'})}
            {text('phone', 'Phone', {placeholder: '+91 …'})}
            {text('whatsapp', 'WhatsApp number', {hint: 'With country code, digits only.', placeholder: '919876543210'})}
            {text('hours', 'Hours', {placeholder: 'Mon–Sat, 10am–7pm'})}
          </div>
          {area('address', 'Address', 3)}
          <div>
            <p className="mb-1.5 text-[0.8125rem] font-medium text-char/80">Social links</p>
            <div className="space-y-2">
              {form.social.map((l, i) => (
                <div key={i} className="grid grid-cols-[8rem_1fr_auto] gap-2">
                  <input aria-label={`Link ${i + 1} name`} value={l.label} onChange={(e) => set('social', form.social.map((x, k) => (k === i ? {...x, label: e.target.value} : x)))} placeholder="Instagram" className={inputCls} />
                  <input aria-label={`Link ${i + 1} address`} aria-invalid={!!errors[`social${i}`]} value={l.href} onChange={(e) => set('social', form.social.map((x, k) => (k === i ? {...x, href: e.target.value} : x)))} placeholder="https://instagram.com/…" className={inputCls} />
                  <Button variant="ghost" aria-label={`Remove link ${i + 1}`} onClick={() => set('social', form.social.filter((_, k) => k !== i))}>
                    ✕
                  </Button>
                  {errors[`social${i}`] && <p className="col-span-3 text-[0.75rem] text-[#9b2c1f]">{errors[`social${i}`]}</p>}
                </div>
              ))}
              <Button onClick={() => set('social', [...form.social, {label: '', href: ''}])}>+ Add link</Button>
            </div>
          </div>
        </Section>

        <Section title="Delivery charges">
          <div className="grid gap-4 sm:grid-cols-2">
            {text('fee', 'Delivery charge (₹)', {hint: '0 = free delivery on every order.'})}
            {text('freeOver', 'Free delivery over (₹)', {hint: 'Optional. Leave empty for no threshold.'})}
          </div>
          <p className="text-[0.75rem] text-char/55">Charged at checkout by the server — customers can't change it.</p>
        </Section>

        <Section title="Our Story">
          {area('storyText', 'Story', 7, 'Leave a blank line between paragraphs. Leave empty to keep the placeholder story.')}
          {text('pullQuote', 'Quote', {placeholder: story.pullQuote})}
        </Section>

        <Section title="Policies" wide>
          <div className="grid gap-4 lg:grid-cols-2">
            {area('shippingPolicy', 'Shipping policy', 6)}
            {area('returns', 'Returns & refunds', 6)}
            {area('privacy', 'Privacy policy', 6)}
            {area('terms', 'Terms & conditions', 6)}
          </div>
          <p className="text-[0.75rem] text-char/55">Payment gateways and Indian consumer rules expect these to be published before you take orders.</p>
        </Section>

        <Section title="Account">
          <p className="text-[0.875rem] text-char/70">
            Signed in as <strong>{user}</strong>
          </p>
          {api.mode === 'live' ? (
            <div className="flex flex-wrap items-end gap-2">
              <Field label="New password" hint="At least 10 characters.">
                {(id, d) => <input id={id} aria-describedby={d} type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} className={`${inputCls} w-64`} />}
              </Field>
              <Button onClick={() => void changePassword()}>Change password</Button>
            </div>
          ) : (
            <p className="text-[0.8125rem] text-char/55">Passwords and staff accounts are available once the panel is connected to Supabase (see README).</p>
          )}
        </Section>
      </div>
    </>
  );
}

function Section({title, children, wide = false}: {title: string; children: ReactNode; wide?: boolean}) {
  return (
    <Card className={`space-y-4 ${wide ? 'xl:col-span-2' : ''}`}>
      <h2 className="font-display text-[1.375rem] font-medium">{title}</h2>
      {children}
    </Card>
  );
}
