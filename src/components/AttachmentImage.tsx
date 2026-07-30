import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { resolveAttachment } from "../data/attachments";

export function AttachmentImage({
  reference,
  ...props
}: { reference?: string } & Omit<ImgHTMLAttributes<HTMLImageElement>, "src">) {
  const [source, setSource] = useState(
    reference?.startsWith("idb://") ? "" : reference ?? "",
  );
  useEffect(() => {
    let cancelled = false;
    resolveAttachment(reference)
      .then((value) => {
        if (!cancelled) setSource(value);
      })
      .catch(() => {
        if (!cancelled) setSource("");
      });
    return () => {
      cancelled = true;
    };
  }, [reference]);
  if (!source) return null;
  return <img src={source} {...props} />;
}

