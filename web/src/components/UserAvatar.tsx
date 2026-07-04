import type { AuthUser } from "@opentranslator/shared-types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { avatarAlt, initialsOf, resolveAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export function UserAvatar({
  user,
  className,
  fallbackClassName,
}: {
  user: AuthUser;
  className?: string;
  fallbackClassName?: string;
}) {
  const src = resolveAvatarUrl(user.avatarUrl);
  return (
    <Avatar className={className}>
      {src ? <AvatarImage src={src} alt={avatarAlt(user)} /> : null}
      <AvatarFallback className={cn("text-[0.7rem]", fallbackClassName)}>
        {initialsOf(user.email)}
      </AvatarFallback>
    </Avatar>
  );
}
