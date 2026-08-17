// src/components/shared/BarcodeScanner.jsx
// Uses Chrome's native BarcodeDetector API — fastest possible camera scanning
import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { CameraOff, Loader2 } from "lucide-react";

// ── Native BarcodeDetector (Chrome 83+) ──────────────────────────────────────
async function startNativeDetector(videoEl, onDetect, stopRef) {
  const detector = new window.BarcodeDetector({
    formats: [
      "ean_13",
      "ean_8",
      "code_128",
      "upc_a",
      "upc_e",
      "code_39",
      "itf",
      "qr_code",
    ],
  });

  const scan = async () => {
    if (stopRef.current) return;
    try {
      const codes = await detector.detect(videoEl);
      if (codes.length > 0 && codes[0].rawValue) {
        onDetect(codes[0].rawValue);
        return;
      }
    } catch (_) {}
    requestAnimationFrame(scan);
  };
  requestAnimationFrame(scan);
}

const BarcodeScanner = ({ onScan, onError, active = true, height = 320 }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const stopNativeRef = useRef(false);
  const html5Ref = useRef(null);
  const regionId = useRef(`qr-${Math.random().toString(36).slice(2)}`).current;
  const [status, setStatus] = useState("idle");
  const lastScanRef = useRef("");
  const cooldownRef = useRef(false);
  const [useNative] = useState(() => !!window.BarcodeDetector);

  const handleDetect = (code) => {
    if (cooldownRef.current || code === lastScanRef.current) return;
    cooldownRef.current = true;
    lastScanRef.current = code;
    onScan(code);
    setTimeout(() => {
      cooldownRef.current = false;
      lastScanRef.current = "";
    }, 1500);
  };

  const stopAll = async () => {
    // Stop native
    stopNativeRef.current = true;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    // Stop html5qrcode
    if (html5Ref.current) {
      try {
        if (html5Ref.current.isScanning) await html5Ref.current.stop();
        html5Ref.current.clear();
      } catch (_) {}
      html5Ref.current = null;
    }
  };

  const startNative = async () => {
    setStatus("starting");
    stopNativeRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      if (!videoRef.current || stopNativeRef.current) return;
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch (playErr) {
        if (playErr.name === "AbortError") return; // unmounted — ignore
        throw playErr;
      }
      if (stopNativeRef.current) return; // stopped while playing
      setStatus("scanning");
      startNativeDetector(videoRef.current, handleDetect, stopNativeRef);
    } catch (err) {
      setStatus("error");
      onError?.(err.message);
    }
  };

  const startHtml5 = async () => {
    setStatus("starting");
    try {
      const scanner = new Html5Qrcode(regionId);
      html5Ref.current = scanner;
      const cameras = await Html5Qrcode.getCameras();
      if (!cameras?.length) {
        setStatus("error");
        onError?.("No camera");
        return;
      }
      const cam =
        cameras.find((c) => /back|rear|environment/i.test(c.label)) ||
        cameras[cameras.length - 1];
      await scanner.start(
        cam.id,
        {
          fps: 30,
          qrbox: (w, h) => ({
            width: Math.round(w * 0.9),
            height: Math.round(h * 0.45),
          }),
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
          ],
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        },
        handleDetect,
        () => {},
      );
      setStatus("scanning");
    } catch (err) {
      setStatus("error");
      onError?.(err?.message);
    }
  };

  useEffect(() => {
    if (active) {
      if (useNative) startNative();
      else startHtml5();
    } else {
      stopAll();
    }
    return () => {
      stopAll();
    };
  }, [active]); // eslint-disable-line

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height,
        borderRadius: 14,
        overflow: "hidden",
        background: "#0a0a0a",
      }}
    >
      {/* Native video element */}
      {useNative && (
        <video
          ref={videoRef}
          muted
          playsInline
          autoPlay
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            filter: "brightness(1.25) contrast(1.1)",
          }}
        />
      )}

      {/* html5-qrcode fallback */}
      {!useNative && (
        <div
          id={regionId}
          style={{
            width: "100%",
            height: "100%",
            filter: "brightness(1.25) contrast(1.1)",
          }}
        />
      )}

      {/* Scan UI overlay */}
      {status === "scanning" && (
        <>
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "27%",
              background: "rgba(0,0,0,0.5)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "27%",
              background: "rgba(0,0,0,0.5)",
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              width: "90%",
              height: "40%",
              pointerEvents: "none",
            }}
          >
            {[
              {
                top: 0,
                left: 0,
                borderTop: "3px solid #00e676",
                borderLeft: "3px solid #00e676",
              },
              {
                top: 0,
                right: 0,
                borderTop: "3px solid #00e676",
                borderRight: "3px solid #00e676",
              },
              {
                bottom: 0,
                left: 0,
                borderBottom: "3px solid #00e676",
                borderLeft: "3px solid #00e676",
              },
              {
                bottom: 0,
                right: 0,
                borderBottom: "3px solid #00e676",
                borderRight: "3px solid #00e676",
              },
            ].map((s, i) => (
              <div
                key={i}
                style={{
                  position: "absolute",
                  width: 26,
                  height: 26,
                  borderRadius: 2,
                  ...s,
                }}
              />
            ))}
            <div
              style={{
                position: "absolute",
                left: 8,
                right: 8,
                height: 2,
                background:
                  "linear-gradient(90deg,transparent,#ff1744,#ff1744,transparent)",
                boxShadow: "0 0 8px #ff1744",
                animation: "scanline 1.4s ease-in-out infinite",
              }}
            />
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 0,
              right: 0,
              textAlign: "center",
              pointerEvents: "none",
            }}
          >
            <span
              style={{
                background: "rgba(0,0,0,0.65)",
                color: "#fff",
                fontSize: 11,
                padding: "4px 14px",
                borderRadius: 20,
              }}
            >
              {useNative
                ? "⚡ Native scanner active"
                : "Align barcode inside the frame"}
            </span>
          </div>

          <div
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(0,0,0,0.65)",
              padding: "4px 10px",
              borderRadius: 20,
            }}
          >
            <div
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#00e676",
                boxShadow: "0 0 6px #00e676",
                animation: "pulse 1.2s ease-in-out infinite",
              }}
            />
            <span style={{ color: "#00e676", fontSize: 11, fontWeight: 600 }}>
              Scanning
            </span>
          </div>
        </>
      )}

      {status === "starting" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0a",
            gap: 10,
          }}
        >
          <Loader2
            size={30}
            style={{ color: "#00e676", animation: "spin 1s linear infinite" }}
          />
          <p style={{ color: "#aaa", fontSize: 13 }}>Starting camera...</p>
        </div>
      )}

      {status === "error" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#0a0a0a",
            gap: 12,
          }}
        >
          <CameraOff size={30} style={{ color: "#ff5252" }} />
          <p
            style={{
              color: "#aaa",
              fontSize: 13,
              textAlign: "center",
              padding: "0 20px",
            }}
          >
            Camera unavailable.
            <br />
            Use manual search below.
          </p>
          <button
            onClick={() => (useNative ? startNative() : startHtml5())}
            style={{
              fontSize: 12,
              padding: "6px 16px",
              borderRadius: 8,
              border: "1px solid #333",
              background: "#1a1a1a",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      <style>{`
        #${regionId} video { object-fit:cover!important; width:100%!important; height:100%!important; }
        #${regionId} canvas, #${regionId} img { display:none!important; }
        @keyframes scanline { 0%{top:8%;opacity:.7} 50%{top:88%;opacity:1} 100%{top:8%;opacity:.7} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes spin { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
};

export default BarcodeScanner;
