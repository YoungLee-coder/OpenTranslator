import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      className={cn(
        // truncate 而非 line-clamp：后者会把子 span 变成 -webkit-box 竖排，打乱 icon+文字横排
        "flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 focus-visible:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:min-w-0 [&>span]:truncate [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className="opacity-50" />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const holdRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const [canScrollUp, setCanScrollUp] = React.useState(false);
  const [canScrollDown, setCanScrollDown] = React.useState(false);

  const updateScrollState = () => {
    const el = viewportRef.current;
    if (!el) return;
    const maxScroll = el.scrollHeight - el.clientHeight;
    setCanScrollUp(el.scrollTop > 0.5);
    setCanScrollDown(maxScroll > 1 && el.scrollTop < maxScroll - 0.5);
  };

  const stopHold = () => {
    if (holdRef.current != null) {
      clearInterval(holdRef.current);
      holdRef.current = null;
    }
  };

  const scrollByDir = (dir: 1 | -1) => {
    const el = viewportRef.current;
    if (!el) return;
    const item = el.querySelector<HTMLElement>('[data-slot="select-item"]');
    const step = item?.offsetHeight ?? 28;
    el.scrollTop += dir * step;
    updateScrollState();
  };

  const startHold = (dir: 1 | -1) => {
    stopHold();
    scrollByDir(dir);
    holdRef.current = setInterval(() => scrollByDir(dir), 50);
  };

  React.useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    updateScrollState();
    const frame = requestAnimationFrame(updateScrollState);
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      stopHold();
    };
  }, []);

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot="select-content"
        className={cn(
          "relative z-50 max-h-72 min-w-32 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper" &&
            "data-[side=bottom]:translate-y-1 data-[side=top]:-translate-y-1",
          className,
        )}
        position={position}
        {...props}
      >
        <SelectPrimitive.Viewport
          ref={viewportRef}
          onScroll={updateScrollState}
          className={cn(
            "p-1",
            position === "popper" &&
              "w-full min-w-[var(--radix-select-trigger-width)]",
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
        <SelectEdgeFade
          side="up"
          visible={canScrollUp}
          onHoldStart={() => startHold(-1)}
          onHoldEnd={stopHold}
        />
        <SelectEdgeFade
          side="down"
          visible={canScrollDown}
          onHoldStart={() => startHold(1)}
          onHoldEnd={stopHold}
        />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectEdgeFade({
  side,
  visible,
  onHoldStart,
  onHoldEnd,
}: {
  side: "up" | "down";
  visible: boolean;
  onHoldStart: () => void;
  onHoldEnd: () => void;
}) {
  return (
    <div
      data-slot={
        side === "up" ? "select-scroll-up-button" : "select-scroll-down-button"
      }
      aria-hidden={!visible}
      className={cn(
        "absolute inset-x-0 z-10 flex items-center justify-center py-1.5",
        "text-muted-foreground/70 transition-opacity duration-200 ease-out",
        side === "up"
          ? "top-0 bg-gradient-to-b from-popover from-45% to-popover/0"
          : "bottom-0 bg-gradient-to-t from-popover from-45% to-popover/0",
        visible ? "opacity-100" : "pointer-events-none opacity-0",
      )}
      onPointerDown={(event) => {
        event.preventDefault();
        onHoldStart();
      }}
      onPointerUp={onHoldEnd}
      onPointerCancel={onHoldEnd}
      onPointerLeave={onHoldEnd}
    >
      {side === "up" ? (
        <ChevronUp className="size-3.5" />
      ) : (
        <ChevronDown className="size-3.5" />
      )}
    </div>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2.5 pr-8 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute right-2 flex size-3.5 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <Check className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronUp className="size-4" />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      className={cn(
        "flex cursor-default items-center justify-center py-1",
        className,
      )}
      {...props}
    >
      <ChevronDown className="size-4" />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
