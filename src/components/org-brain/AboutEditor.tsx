"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { ChipInput } from "@/components/settings/ChipInput";
import { CardFoot, cardClass } from "@/components/ui/Card";
import { CharCount as Count, FieldMsg, fieldClass, textareaClass } from "@/components/ui/Form";
import { notifyError, notifySuccess } from "@/lib/toast";
import { saveOrgProfile } from "@/app/actions/org-brain";
import {
  BRAIN_LIMITS,
  validateOrgProfile,
  type FieldErrors,
  type OrgProfile,
  type ProfileField,
} from "@/lib/api/org-brain-types";

/* About the company (ADR-0039 A1): what it does, its industry, its products and its customers.
   The form on the left; on the right, exactly what every agent will read, updating as you type.
   Not optimistic: one save, the server's copy replaces the form's. */

const L = BRAIN_LIMITS.profile;
const IDS: Record<ProfileField, string> = {
  description: "brain-description",
  industry: "brain-industry",
  products: "brain-products",
  customers: "brain-customers",
};
const ORDER: ProfileField[] = ["description", "industry", "products", "customers"];

export function AgentReads({ profile }: { profile: Pick<OrgProfile, "description" | "industry" | "products" | "customers"> }) {
  const empty = !profile.description.trim() && !profile.industry.trim() && !profile.products.length && !profile.customers.length;
  return (
    <figure className={cardClass({ tone: "well" })}>
      <figcaption className="text-[12.5px] font-semibold text-ink-3">What every agent reads</figcaption>
      {empty ? (
        <p className="mt-3 font-display text-[17px] italic leading-snug text-ink-3">
          Nothing yet. Until this is filled in, agents know your people and your meetings, but not your company.
        </p>
      ) : (
        <div className="mt-3 space-y-3 text-[14px] leading-relaxed text-ink-2">
          {profile.description.trim() ? <p className="whitespace-pre-line text-ink">{profile.description.trim()}</p> : null}
          {profile.industry.trim() ? (
            <p>
              <span className="font-semibold text-ink">Industry: </span>
              {profile.industry.trim()}
            </p>
          ) : null}
          {profile.products.length ? (
            <p>
              <span className="font-semibold text-ink">Products: </span>
              {profile.products.join(", ")}
            </p>
          ) : null}
          {profile.customers.length ? (
            <p>
              <span className="font-semibold text-ink">Customers: </span>
              {profile.customers.join(", ")}
            </p>
          ) : null}
        </div>
      )}
    </figure>
  );
}

export function AboutEditor({ initial, canEdit }: { initial: OrgProfile; canEdit: boolean }) {
  const [saved, setSaved] = useState(initial);
  const [description, setDescription] = useState(initial.description);
  const [industry, setIndustry] = useState(initial.industry);
  const [products, setProducts] = useState<string[]>(initial.products);
  const [customers, setCustomers] = useState<string[]>(initial.customers);
  const [errors, setErrors] = useState<FieldErrors<ProfileField>>({});
  const [saving, setSaving] = useState(false);

  const dirty =
    description !== saved.description ||
    industry !== saved.industry ||
    products.join("\n") !== saved.products.join("\n") ||
    customers.join("\n") !== saved.customers.join("\n");
  const descLen = description.trim().length;

  if (!canEdit)
    return (
      <div className="max-w-[72ch]">
        <AgentReads profile={initial} />
      </div>
    );

  const clear = (f: ProfileField) => errors[f] && setErrors((e) => ({ ...e, [f]: undefined }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (saving) return;
    const checked = validateOrgProfile({ description, industry, products, customers });
    const fail = (errs: FieldErrors<ProfileField>, message?: string) => {
      setErrors(errs);
      notifyError(message ?? "A few details need a look.");
      const first = ORDER.find((f) => errs[f]);
      if (first) document.getElementById(IDS[first])?.focus();
    };
    if (!checked.ok) return fail(checked.errors);
    setSaving(true);
    setErrors({});
    const res = await saveOrgProfile({ ...checked.value });
    setSaving(false);
    if (!res.ok) return fail(res.fieldErrors ?? {}, res.message);
    const next = { ...res.data, description: res.data.description || checked.value.description };
    setSaved(next);
    setDescription(next.description);
    setIndustry(next.industry);
    setProducts(next.products);
    setCustomers(next.customers);
    notifySuccess("Company profile saved", { description: "Agents use it from the next meeting." });
  };

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,340px)]">
      <form onSubmit={submit} noValidate aria-busy={saving || undefined} className={cardClass({ flush: true })}>
        <div className="grid gap-6 px-4 py-5 sm:px-[22px] sm:py-6">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={IDS.description} className="text-[15px] font-semibold text-ink">
                What the company does
              </label>
              <Count n={descLen} max={L.description} />
            </div>
            <textarea
              id={IDS.description}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                clear("description");
              }}
              rows={7}
              placeholder="We make Nimbus, invoicing software for small accounting firms in the UK and Ireland. Most of our customers have 5 to 50 staff."
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={`${IDS.description}-msg`}
              className={`mt-1.5 !resize-y ${textareaClass} ${errors.description ? "!border-priority-high" : ""}`}
            />
            <FieldMsg
              id={`${IDS.description}-msg`}
              error={errors.description}
              hint={
                descLen < L.descriptionReady
                  ? `Plain words, as you would tell a new hire. ${L.descriptionReady - descLen} more characters and this counts toward readiness.`
                  : "Plain words, as you would tell a new hire. Agents read it before every meeting."
              }
            />
          </div>

          <div>
            <div className="flex items-baseline justify-between gap-3">
              <label htmlFor={IDS.industry} className="text-[15px] font-semibold text-ink">
                Industry <span className="font-normal text-ink-3">(optional)</span>
              </label>
              <Count n={industry.trim().length} max={L.industry} />
            </div>
            <input
              id={IDS.industry}
              value={industry}
              onChange={(e) => {
                setIndustry(e.target.value);
                clear("industry");
              }}
              placeholder="Accounting software"
              autoComplete="off"
              aria-invalid={errors.industry ? true : undefined}
              aria-describedby={errors.industry ? `${IDS.industry}-msg` : undefined}
              className={`mt-1.5 ${fieldClass} ${errors.industry ? "!border-priority-high" : ""}`}
            />
            <FieldMsg id={`${IDS.industry}-msg`} error={errors.industry} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={IDS.products} className="text-[15px] font-semibold text-ink">
                  Products
                </label>
                <Count n={products.length} max={L.products.max} />
              </div>
              <div className="mt-1.5">
                <ChipInput
                  id={IDS.products}
                  value={products}
                  onChange={(v) => {
                    setProducts(v);
                    clear("products");
                  }}
                  max={L.products.max}
                  itemMax={L.products.itemMax}
                  placeholder="Nimbus, Nimbus Payroll"
                  describedBy={`${IDS.products}-msg`}
                  invalid={!!errors.products}
                  noun="product"
                />
              </div>
              <FieldMsg id={`${IDS.products}-msg`} error={errors.products} hint="Captions learn to spell these." />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={IDS.customers} className="text-[15px] font-semibold text-ink">
                  Customers
                </label>
                <Count n={customers.length} max={L.customers.max} />
              </div>
              <div className="mt-1.5">
                <ChipInput
                  id={IDS.customers}
                  value={customers}
                  onChange={(v) => {
                    setCustomers(v);
                    clear("customers");
                  }}
                  max={L.customers.max}
                  itemMax={L.customers.itemMax}
                  placeholder="Acme Accounting, Brightside"
                  describedBy={`${IDS.customers}-msg`}
                  invalid={!!errors.customers}
                  noun="customer"
                />
              </div>
              <FieldMsg id={`${IDS.customers}-msg`} error={errors.customers} hint="The names people say out loud in meetings." />
            </div>
          </div>
        </div>

        <CardFoot>
          <Button type="submit" disabled={saving || !dirty} aria-busy={saving || undefined}>
            {saving ? "Saving" : "Save company profile"}
          </Button>
          {dirty ? <p className="text-[14px] text-ink-3">Unsaved changes</p> : null}
        </CardFoot>
      </form>

      <div className="xl:sticky xl:top-4">
        <AgentReads profile={{ description, industry, products, customers }} />
      </div>
    </div>
  );
}
