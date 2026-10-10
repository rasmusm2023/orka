"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";

type BarcodeScanProps = {
  onCode: (code: string) => void;
};

export function BarcodeScan({ onCode }: BarcodeScanProps) {
  const t = useTranslations("Food");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [typed, setTyped] = useState("");
  const [camera, setCamera] = useState(false);
  const [failed, setFailed] = useState(false);
  const onCodeRef = useRef(onCode);

  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => {
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    if (!coarse) {
      return;
    }

    let stop = () => {};
    let cancelled = false;
    const video = videoRef.current;
    if (!video) {
      return;
    }

    setCamera(true);

    async function start() {
      if (!video) {
        return;
      }
      try {
        const detectorWindow = window as Window & {
          BarcodeDetector?: new (options: { formats: string[] }) => {
            detect: (
              source: HTMLVideoElement,
            ) => Promise<Array<{ rawValue: string }>>;
          };
        };
        if (detectorWindow.BarcodeDetector) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: "environment" },
          });
          video.srcObject = stream;
          await video.play();
          const detector = new detectorWindow.BarcodeDetector({
            formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
          });
          const timer = window.setInterval(() => {
            void detector.detect(video).then((codes) => {
              const value = codes[0]?.rawValue;
              if (!cancelled && value) {
                onCodeRef.current(value);
              }
            });
          }, 400);
          stop = () => {
            window.clearInterval(timer);
            stream.getTracks().forEach((track) => track.stop());
          };
          return;
        }

        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromVideoDevice(
          undefined,
          video,
          (result) => {
            if (!cancelled && result) {
              onCodeRef.current(result.getText());
            }
          },
        );
        stop = () => controls.stop();
      } catch {
        if (!cancelled) {
          setFailed(true);
          setCamera(false);
        }
      }
    }

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return (
    <div className="flex flex-col gap-4">
      {camera ? (
        <video
          ref={videoRef}
          muted
          playsInline
          className="bg-ink aspect-[4/3] w-full rounded-control object-cover"
        />
      ) : null}
      {failed ? <p className="text-muted text-sm">{t("cameraFailed")}</p> : null}
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const code = typed.trim();
          if (code) {
            onCode(code);
          }
        }}
      >
        <TextField
          label={t("barcodeType")}
          inputMode="numeric"
          autoComplete="off"
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
        />
        <Button type="submit">{t("lookup")}</Button>
      </form>
    </div>
  );
}
