"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { GearSix, SignOut, UserCircle, UsersThree } from "@phosphor-icons/react";
import { Avatar } from "@/components/ui/Avatar";
import { useOrgContext } from "@/lib/org-context";

/* The account control in the topbar: your face, opening a short menu (profile, settings, the
   Workspace console for admins, sign out). Billing lives in Workspace, for admins only, so a member
   is never handed a link that 404s. Menu-button pattern: Enter, Space or Down opens it on the first item, Up on the last;
   arrows move, Home/End jump, Escape or Tab closes and focus returns to the button. */
export function AccountMenu() {
  const { user } = useOrgContext();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const focusOnOpen = useRef<"first" | "last">("first");
  const id = useId();

  const items = () => Array.from(menu.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);

  useEffect(() => {
    if (!open) return;
    const list = items();
    (focusOnOpen.current === "last" ? list[list.length - 1] : list[0])?.focus();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!menu.current?.contains(t) && !button.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) button.current?.focus();
  };

  const onButtonKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      focusOnOpen.current = e.key === "ArrowUp" ? "last" : "first";
      setOpen(true);
    }
  };

  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    const at = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if (e.key === "Tab") {
      close(false);
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      list[(at + step + list.length) % list.length]?.focus();
    } else if (e.key === "Home" || e.key === "End") {
      e.preventDefault();
      list[e.key === "Home" ? 0 : list.length - 1]?.focus();
    }
  };

  const itemClass =
    "flex h-11 w-full items-center gap-3 rounded-ctl px-3 text-left text-[14px] font-semibold text-ink-2 transition-colors hover:bg-bg-2 hover:text-ink focus-visible:bg-bg-2 focus-visible:text-ink";

  return (
    <div className="relative shrink-0">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={`Account: ${user.name}`}
        onClick={() => {
          focusOnOpen.current = "first";
          setOpen((o) => !o);
        }}
        onKeyDown={onButtonKey}
        className="grid h-10 w-10 place-items-center rounded-full transition-[box-shadow,transform] duration-150 hover:shadow-[0_0_0_3px_var(--bg-2)] motion-safe:active:scale-95 focus-visible:!rounded-full"
      >
        <Avatar name={user.name} id={user.email} seed={user.avatarSeed} src={user.imageUrl} size="md" />
      </button>

      {open ? (
        <div
          ref={menu}
          id={id}
          role="menu"
          aria-label="Account"
          onKeyDown={onMenuKey}
          className="mx-pop absolute right-0 top-[calc(100%+8px)] z-[60] w-[min(280px,calc(100vw-32px))] rounded-card border border-line bg-surface p-2 shadow-warm-3"
        >
          <div className="flex items-center gap-3 px-3 pb-3 pt-2">
            <Avatar name={user.name} id={user.email} seed={user.avatarSeed} src={user.imageUrl} size="md" />
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-semibold text-ink">{user.name}</span>
              <span className="block truncate text-[12.5px] text-ink-3">{user.email}</span>
            </span>
          </div>
          <div className="border-t border-line pt-1.5">
            <Link href="/settings/profile" role="menuitem" tabIndex={-1} onClick={() => setOpen(false)} className={itemClass}>
              <UserCircle size={19} aria-hidden className="text-ink-3" />
              Profile
            </Link>
            <Link href="/settings" role="menuitem" tabIndex={-1} onClick={() => setOpen(false)} className={itemClass}>
              <GearSix size={19} aria-hidden className="text-ink-3" />
              Settings
            </Link>
            {user.role === "admin" ? (
              <Link href="/workspace" role="menuitem" tabIndex={-1} onClick={() => setOpen(false)} className={itemClass}>
                <UsersThree size={19} aria-hidden className="text-ink-3" />
                Workspace
              </Link>
            ) : null}
          </div>
          <div className="mt-1.5 border-t border-line pt-1.5">
            <button
              type="button"
              role="menuitem"
              tabIndex={-1}
              onClick={() => void signOut({ redirectUrl: "/" })}
              className={itemClass}
            >
              <SignOut size={19} aria-hidden className="text-ink-3" />
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
