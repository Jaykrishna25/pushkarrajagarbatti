import {useMemo, useRef, useState} from 'react';
import {PackMockup} from '../../components/Art';
import {moods, type Mood, type StockStatus} from '../../data/products';
import {imageUrl, slugify, type ImageRef, type ProductRow, type VariantRow} from '../../lib/db';
import {formatPaise} from '../../lib/money';
import type {AdminApi, ProductDraft, VariantDraft} from '../api';
import {Button, Card, Confirm, Field, PageHeader, Sheet, Toggle, inputCls, paiseToInput, parseRupees, useToast} from '../ui';

export function Products({api, products, variants, reload}: {api: AdminApi; products: ProductRow[]; variants: VariantRow[]; reload: () => Promise<void>}) {
  const toast = useToast();
  const [editing, setEditing] = useState<ProductDraft | null>(null);
  const [q, setQ] = useState('');
  const shown = products.filter((p) => !q.trim() || `${p.name} ${p.category}`.toLowerCase().includes(q.trim().toLowerCase()));

  const startNew = () =>
    setEditing({
      slug: '',
      name: '',
      category: '',
      mood: 'devotional',
      description: '',
      details: [],
      images: [],
      active: true,
      sort: products.length,
      variants: [{label: '', price_paise: 0, original_price_paise: null, stock_status: 'in_stock', stock_qty: null, max_qty: null, active: true, sort: 0}],
    });

  const startEdit = (p: ProductRow) => {
    const {created_at: _c, updated_at: _u, ...rest} = p;
    void _c;
    void _u;
    setEditing({
      ...rest,
      variants: variants
        .filter((v) => v.product_id === p.id)
        .sort((a, b) => a.sort - b.sort)
        .map(({product_id: _p, ...v}) => (void _p, v)),
    });
  };

  const toggleActive = async (p: ProductRow) => {
    try {
      await api.setProductActive(p.id, !p.active);
      await reload();
      toast(p.active ? `${p.name} hidden from the shop.` : `${p.name} is now visible in the shop.`);
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not update.', 'error');
    }
  };

  return (
    <>
      <PageHeader
        title="Products"
        subtitle="Add fragrances, set prices and packs, and control what's in the shop."
        actions={
          <Button variant="primary" onClick={startNew}>
            + Add product
          </Button>
        }
      />
      <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products" aria-label="Search products" className={`${inputCls} mb-4 max-w-[22rem]`} />

      {shown.length === 0 ? (
        <Card className="text-center">
          <p className="py-8 text-[0.875rem] text-char/60">{products.length ? 'No products match.' : 'No products yet. Add your first fragrance.'}</p>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((p) => {
            const vs = variants.filter((v) => v.product_id === p.id && v.active);
            const prices = vs.map((v) => v.price_paise);
            const out = vs.filter((v) => v.stock_status === 'out_of_stock').length;
            const img = p.images[0];
            return (
              <li key={p.id} className={`flex gap-4 rounded-[10px] bg-white p-4 ring-1 ring-char/8 ${p.active ? '' : 'opacity-60'}`}>
                <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[6px]" style={{background: moods[p.mood].panel}}>
                  {img ? <img src={imageUrl(img)} alt="" className="h-full w-full object-contain" /> : <PackMockup mood={p.mood} className="h-[90%] w-auto" label={false} />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{p.name}</p>
                      <p className="text-[0.75rem] text-char/55">
                        {p.category || 'No category'}
                        {p.category.toLowerCase() !== moods[p.mood].label.toLowerCase() && ` · ${moods[p.mood].label} look`}
                      </p>
                    </div>
                    {!p.active && <span className="shrink-0 rounded-full bg-char/8 px-2 py-0.5 text-[0.6875rem]">Hidden</span>}
                  </div>
                  <p className="mt-1 text-[0.8125rem] text-char/70">
                    {vs.length === 0 ? <span className="text-[#9b2c1f]">No visible packs — not shown in shop</span> : <>
                      {vs.length} pack{vs.length > 1 ? 's' : ''} · {prices.length ? (Math.min(...prices) === Math.max(...prices) ? formatPaise(prices[0]!) : `${formatPaise(Math.min(...prices))} – ${formatPaise(Math.max(...prices))}`) : ''}
                      {out > 0 && <span className="text-[#9b2c1f]"> · {out} out of stock</span>}
                    </>}
                  </p>
                  <div className="mt-auto flex gap-2 pt-3">
                    <Button onClick={() => startEdit(p)} className="min-h-9 px-3">
                      Edit<span className="sr-only"> {p.name}</span>
                    </Button>
                    <Button variant="ghost" onClick={() => void toggleActive(p)} className="min-h-9 px-3">
                      {p.active ? 'Hide' : 'Show'}<span className="sr-only"> {p.name}</span>
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && <ProductEditor key={editing.id ?? 'new'} api={api} initial={editing} allProducts={products} onClose={() => setEditing(null)} reload={reload} />}
    </>
  );
}

/* ------------------------------------------------------------------------ */

type VariantForm = VariantDraft & {key: string; priceText: string; mrpText: string; qtyText: string; maxText: string; track: boolean};
const toForm = (v: VariantDraft, i: number): VariantForm => ({
  ...v,
  key: v.id ?? `new-${i}-${Math.random()}`,
  priceText: v.price_paise ? paiseToInput(v.price_paise) : '',
  mrpText: paiseToInput(v.original_price_paise),
  qtyText: v.stock_qty == null ? '' : String(v.stock_qty),
  maxText: v.max_qty == null ? '' : String(v.max_qty),
  track: v.stock_qty != null,
});

function ProductEditor({api, initial, allProducts, onClose, reload}: {api: AdminApi; initial: ProductDraft; allProducts: ProductRow[]; onClose: () => void; reload: () => Promise<void>}) {
  const toast = useToast();
  const isNew = !initial.id;
  const [p, setP] = useState(initial);
  const [detailsText, setDetailsText] = useState(initial.details.join('\n'));
  const [vs, setVs] = useState<VariantForm[]>(initial.variants.map(toForm));
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const categories = useMemo(() => [...new Set(allProducts.map((x) => x.category).filter(Boolean))], [allProducts]);

  const clearErr = (match: (k: string) => boolean) => setErrors((e) => (Object.keys(e).some(match) ? Object.fromEntries(Object.entries(e).filter(([k]) => !match(k))) : e));
  const set = <K extends keyof ProductDraft>(k: K, v: ProductDraft[K]) => {
    setP((x) => ({...x, [k]: v}));
    clearErr((e) => e === k || (k === 'name' && e === 'slug'));
  };
  const setV = (key: string, patch: Partial<VariantForm>) => {
    setVs((list) => list.map((v) => (v.key === key ? {...v, ...patch} : v)));
    const fields = Object.keys(patch).map((f) => ({label: 'label', priceText: 'price', mrpText: 'mrp', qtyText: 'qty', maxText: 'max'})[f]).filter(Boolean);
    clearErr((e) => fields.some((f) => e === `${key}.${f}`) || e === 'variants');
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      setUploading((n) => n + 1);
      try {
        const img = await api.uploadImage(f);
        setP((x) => ({...x, images: [...x.images, {...img, alt: x.name ? `${x.name} pack` : ''}]}));
      } catch (e) {
        toast(e instanceof Error ? e.message : 'Upload failed.', 'error');
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = '';
  };
  const moveImage = (i: number, d: -1 | 1) =>
    setP((x) => {
      const imgs = [...x.images];
      const j = i + d;
      if (j < 0 || j >= imgs.length) return x;
      [imgs[i], imgs[j]] = [imgs[j]!, imgs[i]!];
      return {...x, images: imgs};
    });
  const setImage = (i: number, patch: Partial<ImageRef>) => setP((x) => ({...x, images: x.images.map((im, k) => (k === i ? {...im, ...patch} : im))}));

  const validate = (): {draft: ProductDraft} | null => {
    const e: Record<string, string> = {};
    const name = p.name.trim();
    const slug = slugify(p.slug || name);
    if (!name) e.name = 'Give the product a name.';
    if (!slug) e.slug = 'Needs letters or numbers.';
    else if (allProducts.some((x) => x.slug === slug && x.id !== p.id)) e.slug = 'Another product already uses this web address.';
    if (vs.length === 0) e.variants = 'Add at least one pack.';
    const out: VariantDraft[] = [];
    vs.forEach((v) => {
      const price = parseRupees(v.priceText);
      const mrp = v.mrpText.trim() ? parseRupees(v.mrpText) : null;
      const qty = v.track ? Number(v.qtyText) : null;
      const max = v.maxText.trim() ? Number(v.maxText) : null;
      if (!v.label.trim()) e[`${v.key}.label`] = 'Pack name needed, e.g. "20 sticks".';
      if (price === null || price <= 0) e[`${v.key}.price`] = 'Enter a price in rupees.';
      if (v.mrpText.trim() && (mrp === null || (price !== null && mrp <= price))) e[`${v.key}.mrp`] = 'MRP must be higher than the price (or leave empty).';
      if (v.track && (!Number.isInteger(qty) || qty! < 0)) e[`${v.key}.qty`] = 'Whole number, 0 or more.';
      if (max !== null && (!Number.isInteger(max) || max < 1)) e[`${v.key}.max`] = 'Whole number, 1 or more (or leave empty).';
      out.push({
        id: v.id,
        label: v.label.trim(),
        price_paise: price ?? 0,
        original_price_paise: mrp,
        stock_status: v.track ? (qty === 0 ? 'out_of_stock' : qty! <= 5 ? 'low_stock' : 'in_stock') : v.stock_status,
        stock_qty: v.track ? qty : null,
        max_qty: max,
        active: v.active,
        sort: 0,
      });
    });
    setErrors(e);
    if (Object.keys(e).length) {
      toast('Please fix the highlighted fields.', 'error');
      return null;
    }
    return {
      draft: {
        ...p,
        name,
        slug,
        category: p.category.trim(),
        description: p.description.trim(),
        details: detailsText.split('\n').map((s) => s.trim()).filter(Boolean),
        images: p.images.map((im) => ({...im, alt: im.alt.trim() || `${name} pack`})),
        variants: out,
      },
    };
  };

  const save = async () => {
    const r = validate();
    if (!r) return;
    setBusy(true);
    try {
      await api.saveProduct(r.draft);
      await reload();
      toast(isNew ? `${r.draft.name} added.` : `${r.draft.name} saved.`);
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not save.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setConfirmDelete(false);
    setBusy(true);
    try {
      await api.deleteProduct(p.id!);
      await reload();
      toast(`${p.name} deleted.`);
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not delete.', 'error');
      setBusy(false);
    }
  };

  return (
    <Sheet
      open
      wide
      onClose={onClose}
      title={isNew ? 'New product' : `Edit ${initial.name}`}
      footer={
        <>
          {!isNew && (
            <Button variant="danger" className="mr-auto" disabled={busy} onClick={() => setConfirmDelete(true)}>
              Delete
            </Button>
          )}
          <Button onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => void save()} disabled={busy || uploading > 0}>
            {busy ? 'Saving…' : uploading ? 'Uploading photo…' : isNew ? 'Add product' : 'Save changes'}
          </Button>
        </>
      }
    >
      <div className="space-y-8">
        {/* Basics */}
        <section className="grid gap-4 md:grid-cols-2">
          <Field label="Product name" error={errors.name}>
            {(id, d) => (
              <input
                id={id}
                data-autofocus
                aria-describedby={d}
                aria-invalid={!!errors.name}
                value={p.name}
                onChange={(e) => {
                  set('name', e.target.value);
                  if (!slugTouched) set('slug', slugify(e.target.value));
                }}
                className={inputCls}
                placeholder="As printed on the pack"
              />
            )}
          </Field>
          <Field label="Web address" hint={`Used for links and search. Letters, numbers and dashes.`} error={errors.slug}>
            {(id, d) => (
              <input
                id={id}
                aria-describedby={d}
                aria-invalid={!!errors.slug}
                value={p.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
                }}
                className={`${inputCls} font-mono`}
              />
            )}
          </Field>
          <Field label="Category" hint="Shoppers can filter by this.">
            {(id, d) => (
              <>
                <input id={id} aria-describedby={d} list="cat-list" value={p.category} onChange={(e) => set('category', e.target.value)} className={inputCls} placeholder="e.g. Floral" />
                <datalist id="cat-list">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <Field label="Look on the website" hint="Sets the colour and texture of this fragrance's panel.">
            {(id, d) => (
              <select id={id} aria-describedby={d} value={p.mood} onChange={(e) => set('mood', e.target.value as Mood)} className={inputCls}>
                {(Object.keys(moods) as Mood[]).map((m) => (
                  <option key={m} value={m}>
                    {moods[m].label}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <div className="md:col-span-2">
            <Field label="Description" hint="Fragrance notes and character, as you'd describe them to a customer.">
              {(id, d) => <textarea id={id} aria-describedby={d} value={p.description} onChange={(e) => set('description', e.target.value)} rows={3} className={inputCls} />}
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Details" hint="One per line — e.g. sticks per pack, burn time, how to use.">
              {(id, d) => <textarea id={id} aria-describedby={d} value={detailsText} onChange={(e) => setDetailsText(e.target.value)} rows={3} className={inputCls} />}
            </Field>
          </div>
        </section>

        {/* Photos */}
        <section>
          <h3 className="mb-1 text-[0.9375rem] font-medium">Photos</h3>
          <p className="mb-3 text-[0.75rem] text-char/55">The first photo is the main one. Upright photos on a plain background look best. Without a photo, the shop shows a drawn concept pack.</p>
          <div className="flex flex-wrap gap-3">
            {p.images.map((im, i) => (
              <div key={(im.path ?? im.src ?? '') + i} className="w-40 rounded-[8px] bg-white p-2 ring-1 ring-char/10">
                <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-[4px] bg-char/5">
                  <img src={imageUrl(im)} alt="" className="h-full w-full object-contain" />
                </div>
                <label className="mt-2 block">
                  <span className="sr-only">Photo {i + 1} description</span>
                  <input value={im.alt} onChange={(e) => setImage(i, {alt: e.target.value})} placeholder="Describe the photo" className={`${inputCls} py-1.5 text-[0.75rem]`} />
                </label>
                <div className="mt-1.5 flex justify-between">
                  <span className="flex">
                    <button type="button" onClick={() => moveImage(i, -1)} disabled={i === 0} aria-label={`Move photo ${i + 1} earlier`} className="flex size-8 items-center justify-center rounded hover:bg-char/8 disabled:opacity-30">
                      ←
                    </button>
                    <button type="button" onClick={() => moveImage(i, 1)} disabled={i === p.images.length - 1} aria-label={`Move photo ${i + 1} later`} className="flex size-8 items-center justify-center rounded hover:bg-char/8 disabled:opacity-30">
                      →
                    </button>
                  </span>
                  <button type="button" onClick={() => set('images', p.images.filter((_, k) => k !== i))} className="px-2 text-[0.75rem] text-[#9b2c1f] hover:underline">
                    Remove
                  </button>
                </div>
              </div>
            ))}
            <label className="flex aspect-[4/5] w-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-[8px] border-2 border-dashed border-char/20 text-center text-[0.8125rem] text-char/60 hover:border-char/40 focus-within:outline-2 focus-within:outline-saffron-deep">
              <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={(e) => void upload(e.target.files)} />
              <span aria-hidden="true" className="text-[1.75rem] leading-none">+</span>
              {uploading ? 'Uploading…' : 'Add photos'}
            </label>
          </div>
        </section>

        {/* Packs & prices */}
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-[0.9375rem] font-medium">Packs & prices</h3>
              <p className="text-[0.75rem] text-char/55">Each pack size has its own price and stock. Prices in ₹, including any taxes you charge.</p>
            </div>
            <Button onClick={() => setVs((l) => [...l, toForm({label: '', price_paise: 0, original_price_paise: null, stock_status: 'in_stock', stock_qty: null, max_qty: null, active: true, sort: l.length}, l.length)])}>+ Add pack</Button>
          </div>
          {errors.variants && <p className="mb-2 text-[0.8125rem] text-[#9b2c1f]">{errors.variants}</p>}
          <div className="space-y-3">
            {vs.map((v, i) => (
              <fieldset key={v.key} className="rounded-[8px] bg-white p-4 ring-1 ring-char/10">
                <legend className="sr-only">Pack {i + 1}</legend>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="Pack name" error={errors[`${v.key}.label`]}>
                    {(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errors[`${v.key}.label`]} value={v.label} onChange={(e) => setV(v.key, {label: e.target.value})} className={inputCls} placeholder="e.g. 20 sticks" />}
                  </Field>
                  <Field label="Price (₹)" error={errors[`${v.key}.price`]}>
                    {(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errors[`${v.key}.price`]} inputMode="decimal" value={v.priceText} onChange={(e) => setV(v.key, {priceText: e.target.value})} className={inputCls} placeholder="99" />}
                  </Field>
                  <Field label="MRP (₹, optional)" hint="Shown struck-through if higher." error={errors[`${v.key}.mrp`]}>
                    {(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errors[`${v.key}.mrp`]} inputMode="decimal" value={v.mrpText} onChange={(e) => setV(v.key, {mrpText: e.target.value})} className={inputCls} />}
                  </Field>
                  <Field label="Max per order (optional)" error={errors[`${v.key}.max`]}>
                    {(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errors[`${v.key}.max`]} inputMode="numeric" value={v.maxText} onChange={(e) => setV(v.key, {maxText: e.target.value})} className={inputCls} />}
                  </Field>
                </div>
                <div className="mt-4 grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-[auto_1fr_auto]">
                  <Toggle checked={v.track} onChange={(track) => setV(v.key, {track, qtyText: track && !v.qtyText ? '0' : v.qtyText})} label="Count stock" description="Stock goes down automatically with each paid order." />
                  {v.track ? (
                    <Field label="Units in stock" error={errors[`${v.key}.qty`]}>
                      {(id, d) => <input id={id} aria-describedby={d} aria-invalid={!!errors[`${v.key}.qty`]} inputMode="numeric" value={v.qtyText} onChange={(e) => setV(v.key, {qtyText: e.target.value})} className={`${inputCls} max-w-[10rem]`} />}
                    </Field>
                  ) : (
                    <Field label="Availability">
                      {(id) => (
                        <select id={id} value={v.stock_status} onChange={(e) => setV(v.key, {stock_status: e.target.value as StockStatus})} className={`${inputCls} max-w-[14rem]`}>
                          <option value="in_stock">In stock</option>
                          <option value="low_stock">Few left</option>
                          <option value="out_of_stock">Out of stock</option>
                        </select>
                      )}
                    </Field>
                  )}
                  <div className="flex items-center gap-4">
                    <Toggle checked={v.active} onChange={(active) => setV(v.key, {active})} label="Visible" />
                    <button type="button" onClick={() => setVs((l) => l.filter((x) => x.key !== v.key))} className="text-[0.8125rem] text-[#9b2c1f] hover:underline">
                      Remove pack
                    </button>
                  </div>
                </div>
              </fieldset>
            ))}
          </div>
        </section>

        {/* Visibility */}
        <section className="grid gap-4 rounded-[8px] bg-white p-4 ring-1 ring-char/10 sm:grid-cols-2">
          <Toggle checked={p.active} onChange={(v) => set('active', v)} label="Show in shop" description="Hidden products stay saved but customers can't see or buy them." />
          <Field label="Position" hint="Lower numbers appear first.">
            {(id, d) => <input id={id} aria-describedby={d} inputMode="numeric" value={String(p.sort)} onChange={(e) => set('sort', Number(e.target.value.replace(/\D/g, '')) || 0)} className={`${inputCls} max-w-[8rem]`} />}
          </Field>
        </section>
      </div>

      <Confirm
        open={confirmDelete}
        danger
        title={`Delete ${initial.name}?`}
        body="This removes the product and its photos for good. Past orders keep their record. To take it off sale temporarily, hide it instead."
        confirmLabel="Delete product"
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
      />
    </Sheet>
  );
}
