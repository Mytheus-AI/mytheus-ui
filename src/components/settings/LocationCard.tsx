"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveLocation } from "@/app/actions/location";
import { LocationFields } from "@/components/app/LocationFields";
import { Button } from "@/components/ui/Button";
import { CardFoot, SectionCard, cardPad } from "@/components/ui/Card";
import { notifySuccess } from "@/lib/toast";
import { countryName, subdivisionName, subdivisionsOf, type Place } from "@/lib/places";

/* Settings > Profile: where you work, the same two fields as the prompt at the foot of the app.
   Self only; the workspace sees members by country and state as counts, never who. */

export function LocationCard({ countries, country: initialCountry, subdivision: initialSubdivision }: { countries: Place[]; country: string | null; subdivision: string | null }) {
  const router = useRouter();
  const [country, setCountry] = useState<string | null>(initialCountry);
  const [subdivision, setSubdivision] = useState<string | null>(initialSubdivision);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = country !== initialCountry || subdivision !== initialSubdivision;

  const save = async () => {
    if (!country) return setError("Choose your country.");
    if (subdivisionsOf(country).length && !subdivision) return setError("Choose your state.");
    setSaving(true);
    setError(null);
    const res = await saveLocation({ country, subdivision, timeZone: null });
    setSaving(false);
    if (!res.ok) return setError(res.message);
    notifySuccess("Location saved", { description: [subdivisionName(subdivision), countryName(country)].filter(Boolean).join(", ") });
    router.refresh();
  };

  return (
    <SectionCard title="Where you work" headingId="location-heading" description="Your country and state. Your workspace's admins see members counted by place, never who is where." clip={false}>
      <div className={cardPad}>
        <LocationFields
          idPrefix="settings-location"
          countries={countries}
          country={country}
          subdivision={subdivision}
          onChange={(c, s) => {
            setCountry(c);
            setSubdivision(s);
            setError(null);
          }}
          disabled={saving}
          size="lg"
        />
      </div>
      <CardFoot>
        <Button type="button" variant="primary" size="md" onClick={() => void save()} disabled={saving || !dirty}>
          {saving ? "Saving" : "Save location"}
        </Button>
        {error ? (
          <p role="alert" className="text-[14px] text-priority-high">
            {error}
          </p>
        ) : null}
      </CardFoot>
    </SectionCard>
  );
}
