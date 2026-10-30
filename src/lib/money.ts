const inr = new Intl.NumberFormat('en-IN', {style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2});

/** Integer paise → "₹1,299" (or "₹1,299.50"). */
export const formatPaise = (paise: number) => inr.format(paise / 100);
