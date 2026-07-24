import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

function Tabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("relative flex flex-col gap-6", className)}
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "inline-flex w-fit items-center gap-6 border-b border-rule text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap px-1 pb-2 pt-1 text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40 data-[state=active]:text-foreground data-[state=inactive]:hover:text-foreground [&_svg]:size-3.5",
        // 下划线指示器：发丝线 + 墨蓝
        "after:absolute after:inset-x-0 after:-bottom-px after:h-px after:scale-x-0 after:bg-primary after:transition-transform data-[state=active]:after:scale-x-100",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  const ref = React.useRef<HTMLDivElement>(null);

  // forceMount 面板切回时若用 display:none，子树 CSS animation 会重放闪白；
  // 改为移出文档流 + inert，保留已完成的 animation 终态。
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const syncInert = () => {
      if (el.getAttribute("data-state") === "inactive") {
        el.setAttribute("inert", "");
      } else {
        el.removeAttribute("inert");
      }
    };
    syncInert();
    const mo = new MutationObserver(syncInert);
    mo.observe(el, { attributes: true, attributeFilter: ["data-state"] });
    return () => mo.disconnect();
  }, []);

  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn(
        "flex-1 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "data-[state=inactive]:pointer-events-none data-[state=inactive]:absolute data-[state=inactive]:inset-x-0 data-[state=inactive]:top-0 data-[state=inactive]:h-0 data-[state=inactive]:overflow-hidden data-[state=inactive]:opacity-0",
        className,
      )}
      {...props}
      ref={ref}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
