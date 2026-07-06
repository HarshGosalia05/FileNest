import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAvatarUrl, getInitials } from "@/lib/profile";
import { cn } from "@/lib/utils";

export function UserAvatar({
  fullName,
  email,
  avatarPath,
  className,
}: {
  fullName?: string | null;
  email?: string | null;
  avatarPath?: string | null;
  className?: string;
}) {
  const { data: url } = useAvatarUrl(avatarPath ?? null);
  const initials = getInitials(fullName || email || "?");
  return (
    <Avatar className={cn("border border-border", className)}>
      {url ? <AvatarImage src={url} alt={fullName || email || "avatar"} /> : null}
      <AvatarFallback className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground text-sm font-semibold">
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
