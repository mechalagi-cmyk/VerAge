
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
import { createWorker } from "tesseract.js";

type Business = {
  id: string;
  business_name: string;
  verification_status: string;
};

type CameraMode = "ktp" | "face" | null;

function extractBirthDate(text: string) {
  const patterns = [
    /\b(\d{2})[-/.](\d{2})[-/.](\d{4})\b/,
    /\b(\d{2})\s+(\d{2})\s+(\d{4})\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) {
      const day = match[1];
      const month = match[2];
      const year = match[3];

      const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
      );

      if (
        date.getFullYear() === Number(year) &&
        date.getMonth() === Number(month) - 1 &&
        date.getDate() === Number(day) &&
        date <= new Date()
      ) {
        return `${year}-${month}-${day}`;
      }
    }
  }

  return "";
}

export default function AgeVerificationPage() {
  const supabase = createClient();
  const router = useRouter();

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [userId, setUserId] = useState("");
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [businessId, setBusinessId] = useState("");

  const [cameraMode, setCameraMode] = useState<CameraMode>(null);

  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [faceFile, setFaceFile] = useState<File | null>(null);

  const [ktpPreview, setKtpPreview] = useState("");
  const [facePreview, setFacePreview] = useState("");

  const [birthDate, setBirthDate] = useState("");
  const [ocrStatus, setOcrStatus] = useState("Pending");
  const [ocrLoading, setOcrLoading] = useState(false);

  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{
    age: number;
    verification_result: string;
  } | null>(null);

  useEffect(() => {
    async function loadBusinesses() {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        router.replace("/login");
        return;
      }

      setUserId(authData.user.id);

      const { data, error } = await supabase
        .from("businesses")
        .select("id, business_name, verification_status")
        .eq("user_id", authData.user.id)
        .eq("verification_status", "Verified")
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(error.message);
        return;
      }

      setBusinesses(data || []);

      if (data && data.length > 0) {
        setBusinessId(data[0].id);
      }
    }

    loadBusinesses();
  }, [router]);

  useEffect(() => {
    if (cameraMode && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {
        setMessage("Camera tidak dapat dijalankan.");
      });
    }
  }, [cameraMode]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startCamera(mode: "ktp" | "face") {
    setMessage("");

    try {
      streamRef.current?.getTracks().forEach((track) => track.stop());

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode:
            mode === "ktp" ? "environment" : "user",
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraMode(mode);
    } catch {
      setMessage(
        "Tidak dapat mengakses kamera. Periksa izin kamera browser."
      );
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraMode(null);
  }

  function capturePhoto() {
    const video = videoRef.current;

    if (!video || !video.videoWidth) {
      setMessage("Kamera belum siap. Coba lagi.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      setMessage("Gagal mengambil foto.");
      return;
    }

    context.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setMessage("Gagal memproses foto.");
          return;
        }

        const mode = cameraMode;

        const file = new File(
          [blob],
          mode === "ktp" ? "ktp.jpg" : "face.jpg",
          { type: "image/jpeg" }
        );

        const preview = URL.createObjectURL(file);

        if (mode === "ktp") {
          setKtpFile(file);
          setKtpPreview(preview);
        }

        if (mode === "face") {
          setFaceFile(file);
          setFacePreview(preview);
        }

        stopCamera();
      },
      "image/jpeg",
      0.85
    );
  }

  async function readKtp() {
    if (!ktpFile) {
      setMessage("Ambil foto KTP terlebih dahulu.");
      return;
    }

    setOcrLoading(true);
    setMessage("");

    try {
      const worker = await createWorker("ind+eng");

      const {
        data: { text },
      } = await worker.recognize(ktpFile);

      await worker.terminate();

      const extractedDate = extractBirthDate(text);

      if (extractedDate) {
        setBirthDate(extractedDate);
        setOcrStatus("Completed");
        setMessage(
          "Tanggal lahir berhasil dibaca. Mohon periksa kembali dengan KTP asli."
        );
      } else {
        setOcrStatus("Failed");
        setMessage(
          "Tanggal lahir belum terbaca. Silakan masukkan secara manual sesuai KTP."
        );
      }
    } catch {
      setOcrStatus("Failed");
      setMessage("OCR gagal dijalankan. Coba lagi.");
    } finally {
      setOcrLoading(false);
    }
  }

  async function submitVerification() {
    if (!userId || !businessId || !birthDate || !ktpFile || !faceFile) {
      setMessage(
        "Lengkapi outlet, tanggal lahir, foto KTP, dan foto wajah."
      );
      return;
    }

    if (!consent) {
      setMessage("Persetujuan customer wajib diberikan.");
      return;
    }

    if (birthDate > new Date().toLocaleDateString("en-CA")) {
      setMessage("Tanggal lahir tidak boleh di masa depan.");
      return;
    }

    setLoading(true);
    setMessage("");
    setResult(null);

    const verificationId = crypto.randomUUID();

    const basePath =
      `${userId}/${businessId}/${verificationId}`;

    const ktpPath = `${basePath}/ktp.jpg`;
    const facePath = `${basePath}/face.jpg`;

    try {
      const ktpUpload = await supabase.storage
        .from("age-verification")
        .upload(ktpPath, ktpFile, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (ktpUpload.error) {
        throw new Error(ktpUpload.error.message);
      }

      const faceUpload = await supabase.storage
        .from("age-verification")
        .upload(facePath, faceFile, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (faceUpload.error) {
        await supabase.storage
          .from("age-verification")
          .remove([ktpPath]);

        throw new Error(faceUpload.error.message);
      }

      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() + 30);

      const { data, error } = await supabase
        .from("age_verifications")
        .insert({
          id: verificationId,
          business_id: businessId,
          birth_date: birthDate,
          ktp_image_path: ktpPath,
          face_image_path: facePath,
          ocr_status: ocrStatus,
          face_match_status: "Not Run",
          liveness_status: "Not Run",
          dukcapil_status: "Not Checked",
          consent_at: new Date().toISOString(),
          retention_delete_after: retentionDate.toISOString(),
        })
        .select(
          "id, age, verification_result, verification_date"
        )
        .single();

      if (error) {
        await supabase.storage
          .from("age-verification")
          .remove([ktpPath, facePath]);

        throw new Error(error.message);
      }

      setResult({
        age: data.age,
        verification_result: data.verification_result,
      });

      setKtpFile(null);
      setFaceFile(null);
      setKtpPreview("");
      setFacePreview("");
      setBirthDate("");
      setConsent(false);
      setOcrStatus("Pending");

      setMessage("Pemeriksaan usia berhasil disimpan.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Terjadi kesalahan saat menyimpan verifikasi."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FAF8F4] p-5 md:p-10">
      <div className="mx-auto max-w-4xl">
        <button
          onClick={() => router.push("/merchant")}
          className="mb-6 text-sm font-semibold text-[#713247]"
        >
          ← Back to Merchant Dashboard
        </button>

        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B68A45]">
            VERAGE / MERCHANT
          </p>

          <h1 className="mt-2 text-3xl font-bold text-[#541D2E]">
            Customer Age Verification
          </h1>

          <p className="mt-2 text-sm text-[#8A7778]">
            Verify customer age before completing a transaction.
          </p>
        </div>

        <div className="space-y-6 rounded-2xl border border-[#E9DED5] bg-white p-6 shadow-sm">
          <div>
            <label className="mb-2 block text-sm font-semibold text-[#38272B]">
              Select Verified Outlet
            </label>

            <select
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              className="w-full rounded-xl border border-[#E9DED5] p-3"
            >
              <option value="">Select outlet</option>

              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.business_name}
                </option>
              ))}
            </select>

            {businesses.length === 0 && (
              <p className="mt-2 text-sm text-red-600">
                No verified outlet found. Verify your business first.
              </p>
            )}
          </div>

          <div className="rounded-xl border border-[#E9DED5] p-4">
            <h2 className="font-bold text-[#541D2E]">
              1. Customer KTP Scanner
            </h2>

            <p className="my-2 text-sm text-[#8A7778]">
              Use the rear camera to photograph the customer's KTP.
            </p>

            {ktpPreview && (
              <img
                src={ktpPreview}
                alt="KTP preview"
                className="mb-3 max-h-64 rounded-lg border object-contain"
              />
            )}

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => startCamera("ktp")}
                className="rounded-lg bg-[#541D2E] px-4 py-2 text-sm text-white"
              >
                Open KTP Camera
              </button>

              <button
                onClick={readKtp}
                disabled={!ktpFile || ocrLoading}
                className="rounded-lg bg-[#B68A45] px-4 py-2 text-sm text-white disabled:opacity-50"
              >
                {ocrLoading ? "Reading KTP..." : "Read KTP with OCR"}
              </button>
            </div>

            <p className="mt-2 text-xs text-[#8A7778]">
              OCR status: {ocrStatus}
            </p>
          </div>

          <div className="rounded-xl border border-[#E9DED5] p-4">
            <h2 className="font-bold text-[#541D2E]">
              2. Customer Face Capture
            </h2>

            <p className="my-2 text-sm text-[#8A7778]">
              Ask the customer for consent before taking a face photograph.
            </p>

            {facePreview && (
              <img
                src={facePreview}
                alt="Face preview"
                className="mb-3 max-h-64 rounded-lg border object-contain"
              />
            )}

            <button
              onClick={() => startCamera("face")}
              className="rounded-lg bg-[#541D2E] px-4 py-2 text-sm text-white"
            >
              Open Selfie Camera
            </button>

            <p className="mt-2 text-xs text-[#8A7778]">
              Face matching and liveness detection are not active yet.
            </p>
          </div>

          {cameraMode && (
            <div className="rounded-xl border border-[#E9DED5] p-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full rounded-lg bg-black"
              />

              <div className="mt-3 flex gap-2">
                <button
                  onClick={capturePhoto}
                  className="rounded-lg bg-[#541D2E] px-4 py-2 text-white"
                >
                  Capture Photo
                </button>

                <button
                  onClick={stopCamera}
                  className="rounded-lg border border-[#E9DED5] px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-[#38272B]">
              Customer Date of Birth
            </label>

            <input
              type="date"
              value={birthDate}
              max={new Date().toLocaleDateString("en-CA")}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full rounded-xl border border-[#E9DED5] p-3"
            />

            <p className="mt-2 text-xs text-[#8A7778]">
              Check the extracted date against the original KTP.
            </p>
          </div>

          <label className="flex items-start gap-3 text-sm text-[#38272B]">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-1"
            />

            <span>
              Customer has been informed and has consented to the
              collection and private storage of their KTP and face
              photographs for age verification.
            </span>
          </label>

          {message && (
            <p className="rounded-lg bg-[#F5EBDD] p-3 text-sm text-[#541D2E]">
              {message}
            </p>
          )}

          {result && (
            <div className="rounded-xl border border-[#E9DED5] bg-[#FAF8F4] p-5">
              <h2 className="font-bold text-[#541D2E]">
                Verification Result
              </h2>

              <p className="mt-3 text-2xl font-bold">
                {result.verification_result}
              </p>

              <p className="mt-1 text-sm text-[#8A7778]">
                Calculated age: {result.age} years
              </p>

              <p className="mt-2 text-xs text-[#8A7778]">
                Age threshold: 21 years.
              </p>
            </div>
          )}

          <button
            onClick={submitVerification}
            disabled={loading || businesses.length === 0}
            className="w-full rounded-xl bg-[#541D2E] px-5 py-3 font-semibold text-white disabled:opacity-50"
          >
            {loading ? "Saving Verification..." : "Submit Age Verification"}
          </button>
        </div>
      </div>
    </main>
  );
}
