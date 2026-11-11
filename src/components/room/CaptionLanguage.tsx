"use client";

import { useId } from "react";
import { Translate } from "@phosphor-icons/react";
import { Popover } from "@/components/room/Popover";
import { CAPTION_LANGUAGES, type CaptionLanguage } from "@/lib/realtime/privacy";

/* The caption language picker in the control bar (live translation, polish program wave 3). A
   viewer reads captions as spoken, or translated into one of twelve languages. The choice is
   personal: only this screen gets the translations, and it is remembered in this browser. Finals
   are translated by the agent tier and replace their line when they arrive; what is still being
   said stays in the language it is spoken in. */

export function CaptionLanguagePicker({
  value,
  onChange,
}: {
  value: CaptionLanguage | null;
  onChange: (language: CaptionLanguage | null) => void;
}) {
  const name = useId();
  const current = CAPTION_LANGUAGES.find((l) => l.code === value);
  return (
    <Popover
      label={current ? `Caption language: ${current.name}` : "Caption language: as spoken"}
      tip={current ? `Captions in ${current.name}` : "Translate captions"}
      icon={
        <span className="ctl-lang">
          <Translate size={20} weight={current ? "fill" : "regular"} aria-hidden />
          {current ? <span className="ctl-lang-code">{current.code.toUpperCase()}</span> : null}
        </span>
      }
      panelClassName="is-langs"
      panelLabel="Caption language"
    >
      {(close) => (
        <fieldset className="lang-menu">
          <legend>Caption language</legend>
          <p className="lang-note">Only your captions change. Lines are translated once they are settled.</p>
          <label className={`lang-opt${value === null ? " is-on" : ""}`}>
            <input
              type="radio"
              name={name}
              checked={value === null}
              onChange={() => {
                onChange(null);
                close();
              }}
            />
            <span>
              <strong>As spoken</strong>
              <small>No translation</small>
            </span>
          </label>
          <div className="lang-grid">
            {CAPTION_LANGUAGES.map((l) => (
              <label key={l.code} className={`lang-opt${value === l.code ? " is-on" : ""}`}>
                <input
                  type="radio"
                  name={name}
                  checked={value === l.code}
                  onChange={() => {
                    onChange(l.code);
                    close();
                  }}
                />
                <span>
                  <strong>{l.name}</strong>
                  <small lang={l.code}>{l.native}</small>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </Popover>
  );
}
