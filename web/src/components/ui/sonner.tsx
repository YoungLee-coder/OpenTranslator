import { Toaster as SonnerToaster, type ToasterProps } from "sonner";
import { useTheme } from "@/components/theme-provider";

/** Toast 容器：跟随主题，编辑级克制风。 */
export function Toaster(props: ToasterProps) {
  const { theme } = useTheme();
  return (
    <SonnerToaster
      theme={theme}
      position="bottom-right"
      richColors={false}
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-md group-[.toaster]:border group-[.toaster]:bg-card group-[.toaster]:shadow-md group-[.toaster]:text-card-foreground",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}

export { toast } from "sonner";
