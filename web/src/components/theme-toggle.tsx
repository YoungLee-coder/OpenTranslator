import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button
      variant="ghost"
      size="icon"
      type="button"
      onClick={toggle}
      title={theme === "dark" ? "切换到浅色" : "切换到深色"}
      aria-label="切换主题"
    >
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
