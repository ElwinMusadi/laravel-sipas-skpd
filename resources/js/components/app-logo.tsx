import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  showSubtitle?: boolean;
};

export default function AppLogo({ className, showSubtitle = true }: Props) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <img
        src="/images/logo-pemprov-ntt.png"
        alt="Lambang Pemprov Nusa Tenggara Timur"
        className="size-9 shrink-0 object-contain"
      />
      <span className="grid min-w-0 text-left leading-tight">
        <span className="truncate text-sm font-semibold tracking-tight">
          SIPAS-SKPD
        </span>
        {showSubtitle && (
          <span className="text-muted-foreground truncate text-[11px]">
            UPTD Penda Kota Kupang
          </span>
        )}
      </span>
    </div>
  );
}
