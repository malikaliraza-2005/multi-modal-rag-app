"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as React from "react";
import { cn } from "@/lib/cn";

export const Menu = DropdownMenu.Root;
export const MenuTrigger = DropdownMenu.Trigger;

export function MenuContent({
  className,
  children,
  align = "start",
  ...props
}: React.ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align={align}
        sideOffset={6}
        className={cn(
          // Shadow appears only on genuinely floating layers.
          "z-50 min-w-56 overflow-hidden rounded-lg border border-n-3 bg-n-0 p-1",
          "shadow-[0_8px_24px_-8px_rgb(0_0_0/0.18)]",
          className,
        )}
        {...props}
      >
        {children}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}

export function MenuItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenu.Item>) {
  return (
    <DropdownMenu.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1.5 text-sm",
        "text-n-10 outline-none transition-colors duration-100",
        "data-highlighted:bg-n-2 data-highlighted:text-n-12",
        className,
      )}
      {...props}
    />
  );
}

export function MenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenu.Label>) {
  return (
    <DropdownMenu.Label
      className={cn(
        "px-2 pb-1 pt-1.5 text-2xs font-medium uppercase tracking-wider text-n-7",
        className,
      )}
      {...props}
    />
  );
}

export function MenuSeparator() {
  return <DropdownMenu.Separator className="my-1 h-px bg-n-3" />;
}
