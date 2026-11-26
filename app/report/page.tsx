
"use client";

import { useState, type FormEvent } from "react";
import { createClient } from "../../lib/supabase/client";

export default function PublicReportPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [reporterName, setReporterName] = useState("");
  const [reporterContact, setReporterContact] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("Jawa Barat");
  const [violationType, setViolationType] = useState("");
  const [description, setDescription] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
if (!evidenceFile) {
  setError("Foto bukti wajib diunggah sebelum mengirim laporan.");
  return;
}
    setLoading(true);
    setError("");
    setMessage("");

    try {
 const extension = evidenceFile.name.split(".").pop()?.toLowerCase();

const fileName = `${crypto.randomUUID()}.${extension}`;
const evidencePath = `public-reports/${fileName}`;

const { error: uploadError } = await supabase.storage
  .from("public-reports")
  .upload(evidencePath, evidenceFile, {
    contentType: evidenceFile.type,
    upsert: false,
  });

if (uploadError) throw uploadError;
      const { error: insertError } = await supabase
        .from("public_reports")
        .insert({
          reporter_name: reporterName.trim() || null,
          reporter_contact: reporterContact.trim() || null,
          business_name: businessName.trim() || null,
          business_address: businessAddress.trim(),
          city: city.trim(),
          province: province.trim(),
          violation_type: violationType,
          description: description.trim(),
          evidence_url: evidencePath,
          status: "Received",
        });

      if (insertError) throw insertError;

      setMessage(
        "Laporan berhasil dikirim. Terima kasih telah membantu pengawasan peredaran minuman beralkohol."
      );

      setReporterName("");
      setReporterContact("");
      setBusinessName("");
      setBusinessAddress("");
      setCity("");
      setProvince("Jawa Barat");
      setViolationType("");
      setDescription("");
      setEvidenceFile(null);

      const fileInput = document.getElementById(
        "evidence"
      ) as HTMLInputElement | null;

      if (fileInput) fileInput.value = "";
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Terjadi kesalahan saat mengirim laporan."
      );
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid #E9DED5",
    borderRadius: "8px",
    fontSize: "14px",
    outline: "none",
    background: "#FFFFFF",
    color: "#38272B",
  };

  const labelStyle = {
    display: "block",
    fontSize: "14px",
    fontWeight: 600,
    color: "#541D2E",
    marginBottom: "8px",
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#FAF8F4",
        padding: "50px 20px",
        color: "#38272B",
      }}
    >
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "35px" }}>
          <p
            style={{
              color: "#B68A45",
              fontWeight: 700,
              letterSpacing: "2px",
              fontSize: "12px",
            }}
          >
            VERAGE PUBLIC SERVICE
          </p>

          <h1
            style={{
              color: "#541D2E",
              fontSize: "34px",
              margin: "10px 0",
              fontFamily: "Georgia, serif",
            }}
          >
            Public Reporting
          </h1>

          <p style={{ color: "#8A7778", lineHeight: 1.7 }}>
            Bantu kami mengawasi peredaran minuman beralkohol
            dengan melaporkan dugaan pelanggaran di sekitar Anda.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          style={{
            background: "#FFFFFF",
            padding: "32px",
            borderRadius: "16px",
            border: "1px solid #E9DED5",
            boxShadow: "0 8px 30px rgba(84,29,46,0.06)",
          }}
        >
          <h2 style={{ color: "#541D2E", fontSize: "19px" }}>
            Reporter Information
          </h2>

          <p style={{ color: "#8A7778", fontSize: "13px", marginBottom: "22px" }}>
            Informasi pelapor bersifat opsional dan akan dijaga kerahasiaannya.
          </p>

          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle}>Nama Pelapor (Opsional)</label>
            <input
              style={inputStyle}
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
              placeholder="Masukkan nama Anda"
              maxLength={150}
            />
          </div>

          <div style={{ marginBottom: "28px" }}>
            <label style={labelStyle}>Kontak Pelapor (Opsional)</label>
            <input
              style={inputStyle}
              value={reporterContact}
              onChange={(e) => setReporterContact(e.target.value)}
              placeholder="Nomor telepon atau email"
              maxLength={150}
            />
          </div>

          <div
            style={{
              borderTop: "1px solid #E9DED5",
              paddingTop: "25px",
            }}
          >
            <h2 style={{ color: "#541D2E", fontSize: "19px" }}>
              Business Information
            </h2>

            <p style={{ color: "#8A7778", fontSize: "13px", marginBottom: "22px" }}>
              Isi informasi lokasi usaha yang ingin dilaporkan.
            </p>
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle}>Nama Toko / Usaha</label>
            <input
              style={inputStyle}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Nama toko jika diketahui"
              maxLength={200}
            />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle}>Alamat Lengkap *</label>
            <textarea
              required
              style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }}
              value={businessAddress}
              onChange={(e) => setBusinessAddress(e.target.value)}
              placeholder="Masukkan alamat lokasi usaha"
              maxLength={1000}
            />
          </div>

          <div style={{ marginBottom: "18px" }}>
            <label style={labelStyle}>Kota / Kabupaten *</label>
            <input
              required
              style={inputStyle}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Contoh: Kabupaten Bekasi"
              maxLength={150}
            />
          </div>

          <div style={{ marginBottom: "28px" }}>
            <label style={labelStyle}>Provinsi *</label>
            <input
              required
              style={inputStyle}
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              maxLength={150}
            />
          </div>

          <div
            style={{
              borderTop: "1px solid #E9DED5",
              paddingTop: "25px",
            }}
          >
            <h2 style={{ color: "#541D2E", fontSize: "19px" }}>
              Report Details
            </h2>
          </div>

          <div style={{ marginTop: "20px", marginBottom: "18px" }}>
            <label style={labelStyle}>Jenis Dugaan Pelanggaran *</label>
            <select
              required
              style={inputStyle}
              value={violationType}
              onChange={(e) => setViolationType(e.target.value)}
            >
              <option value="">Pilih jenis pelanggaran</option>
              <option value="Illegal Alcohol Sales">
                Penjualan minuman beralkohol tanpa izin
              </option>
              <option value="Unlicensed Alcohol Distribution">
                Distribusi minuman beralkohol tanpa izin
              </option>
              <option value="Underage Alcohol Sales">
                Dugaan penjualan kepada anak di bawah umur
              </option>
              <option value="Unregistered Alcohol Outlet">
                Outlet minuman beralkohol tidak terdaftar
              </option>
              <option value="Other">Lainnya</option>
            </select>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Deskripsi Laporan *</label>
            <textarea
              required
              style={{ ...inputStyle, minHeight: "130px", resize: "vertical" }}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan informasi dugaan pelanggaran, waktu kejadian, dan detail lainnya..."
              maxLength={5000}
            />
          </div>

          <div style={{ marginBottom: "25px" }}>
            <label style={labelStyle}>Foto Bukti </label>
            <input
              id="evidence"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;

                if (file && file.size > 5 * 1024 * 1024) {
                  setError("Ukuran foto maksimal 5 MB.");
                  e.target.value = "";
                  setEvidenceFile(null);
                  return;
                }

                setError("");
                setEvidenceFile(file);
              }}
              style={{ ...inputStyle, padding: "10px" }}
            />
<p style={{ fontSize: "12px", color: "#8A7778", marginTop: "7px" }}>
  Wajib diisi. Format JPG, PNG, atau WEBP. Maksimal 5 MB.
</p>
          </div>

          {error && (
            <div
              style={{
                padding: "13px",
                background: "#FCECEC",
                color: "#A12D2D",
                borderRadius: "8px",
                fontSize: "13px",
                marginBottom: "18px",
                overflowWrap: "anywhere",
              }}
            >
              {error}
            </div>
          )}

          {message && (
            <div
              style={{
                padding: "15px",
                background: "#EDF5EC",
                color: "#32643A",
                borderRadius: "8px",
                fontSize: "14px",
                marginBottom: "18px",
                lineHeight: 1.6,
              }}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "15px",
              background: loading ? "#8A7778" : "#541D2E",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "8px",
              fontSize: "15px",
              fontWeight: 700,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Submitting Report..." : "Submit Report"}
          </button>

          <p
            style={{
              fontSize: "12px",
              color: "#8A7778",
              textAlign: "center",
              marginTop: "18px",
              lineHeight: 1.6,
            }}
          >
            Setiap laporan akan ditinjau oleh pihak Government VerAge.
            Pengiriman laporan tidak berarti dugaan pelanggaran telah terbukti.
          </p>
        </form>

        <p
          style={{
            textAlign: "center",
            color: "#8A7778",
            fontSize: "12px",
            marginTop: "25px",
          }}
        >
          © VerAge — Integrated Alcohol Control System
        </p>
      </div>
    </main>
  );
}
