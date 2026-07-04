import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LOCALES, useLocale, useTranslation } from "@/lib/i18n";

/** Inline globe button for header (guests or compact layout). */
export function LanguageMenuButton() {
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label={t("locale.label")}
            >
              <Globe className="size-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("locale.label")}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="min-w-40">
        <DropdownMenuLabel>{t("locale.label")}</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(v) => {
            if (v === "zh-CN" || v === "en") setLocale(v);
          }}
        >
          {LOCALES.map((item) => (
            <DropdownMenuRadioItem key={item.id} value={item.id}>
              {t(item.labelKey)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Language section inside the avatar dropdown. */
export function LanguageMenuItems() {
  const { locale, setLocale } = useLocale();
  const { t } = useTranslation();

  return (
    <>
      <DropdownMenuLabel className="flex items-center gap-2">
        <Globe className="size-4" />
        {t("locale.label")}
      </DropdownMenuLabel>
      {LOCALES.map((item) => (
        <DropdownMenuItem
          key={item.id}
          onSelect={() => setLocale(item.id)}
          className={locale === item.id ? "bg-accent" : undefined}
        >
          {t(item.labelKey)}
        </DropdownMenuItem>
      ))}
      <DropdownMenuSeparator />
    </>
  );
}
