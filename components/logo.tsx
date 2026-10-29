import Image from "next/image";

export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <Image src="/logo.png" width={32} height={32} alt="" priority className="rounded-[9px]" />
      <span className="font-display text-[19px] font-semibold tracking-tight">
        PaperChase <span className="text-up">AI</span>
      </span>
    </div>
  );
}
