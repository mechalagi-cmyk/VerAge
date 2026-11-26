
"use client";

import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

const WestJavaMap = dynamic(
  () => import("../components/maps/WestJavaMap"),
  {
    ssr: false,
    loading: () => (
      <div className="mt-8 rounded-xl bg-white p-8 text-center text-gray-500">
        Loading outlet map...
      </div>
    ),
  }
);

type Menu =
  | "Overview"
  | "Business Verification"
  | "Outlet Monitoring"
  | "Age Verification Monitoring"
  | "Public Reports"
  | "Reports";

type Business = {
  id: string;
  business_name: string;
  business_type: string;
  nib: string;
  license_number: string | null;
  address: string;
  province: string;
  city: string;
  postal_code: string | null;
  phone: string | null;
  business_email: string | null;
  verification_status: string;
  rejection_reason: string | null;
  created_at: string;
};

type PublicReport = {
  id: string;
  reporter_name: string | null;
  reporter_contact: string | null;
  business_name: string | null;
  business_address: string;
  city: string;
  province: string;
  violation_type: string;
  description: string;
  evidence_url: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

type AgeVerification = {
  id: string;
  business_id: string;
  merchant_id: string;
  birth_date: string;
  verification_date: string;
  age: number;
  verification_result: "Approved" | "Rejected";
  ocr_status: string;
  face_match_status: string;
  liveness_status: string;
  dukcapil_status: string;
  businesses: {
    business_name: string;
    city: string;
    province: string;
  } | null;
};

export default function GovernmentDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [activeMenu, setActiveMenu] = useState<Menu>("Overview");

  const [reportPeriod, setReportPeriod] = useState<
    "all" | "today" | "7days" | "30days" | "month" | "custom"
  >("all");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [publicReports, setPublicReports] = useState<PublicReport[]>([]);
  const [ageVerifications, setAgeVerifications] = useState<AgeVerification[]>([]);
  const [ageResultFilter, setAgeResultFilter] = useState("All");

  const [selectedPublicReport, setSelectedPublicReport] =
    useState<PublicReport | null>(null);

  const [reportNotes, setReportNotes] = useState("");
  const [reportStatus, setReportStatus] = useState("Received");
  const [reportActionLoading, setReportActionLoading] = useState(false);
  const [reportEvidenceUrl, setReportEvidenceUrl] = useState("");
  const [evidenceLoading, setEvidenceLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [authorized, setAuthorized] = useState(false);

  const [selectedBusiness, setSelectedBusiness] =
    useState<Business | null>(null);

  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  // LOAD DASHBOARD DATA
  async function loadDashboard() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || profile?.role !== "government") {
      setAuthorized(false);
      setLoading(false);
      return;
    }

    setAuthorized(true);

    const { data: businessData, error: businessError } = await supabase
      .from("businesses")
      .select("*")
      .order("created_at", { ascending: false });

    if (businessError) {
      setError(businessError.message);
      setLoading(false);
      return;
    }

    setBusinesses((businessData || []) as Business[]);

    const { data: reportsData, error: reportsError } = await supabase
      .from("public_reports")
      .select("*")
      .order("created_at", { ascending: false });

    if (reportsError) {
      setError(reportsError.message);
      setLoading(false);
      return;
    }

    setPublicReports((reportsData || []) as PublicReport[]);

    // LOAD AGE VERIFICATION RECORDS
    const { data: ageData, error: ageError } = await supabase
      .from("age_verifications")
      .select(`
        id,
        business_id,
        merchant_id,
        birth_date,
        verification_date,
        age,
        verification_result,
        ocr_status,
        face_match_status,
        liveness_status,
        dukcapil_status,
        businesses (
          business_name,
          city,
          province
        )
      `)
      .order("verification_date", { ascending: false });

    if (ageError) {
      setError(ageError.message);
      setLoading(false);
      return;
    }

    setAgeVerifications(
      (ageData || []) as unknown as AgeVerification[]
    );

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  // LOGOUT
  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  // BUSINESS REVIEW
  async function handleReview(
    businessId: string,
    status: "Verified" | "Rejected",
    reason?: string
  ) {
    setReviewing(true);
    setReviewingId(businessId);
    setError("");
    setSuccess("");

    const { error: reviewError } = await supabase.rpc(
      "review_business",
      {
        p_business_id: businessId,
        p_status: status,
        p_rejection_reason: reason || null,
      }
    );

    if (reviewError) {
      setError(reviewError.message);
      setReviewing(false);
      setReviewingId(null);
      return;
    }

    setSuccess(
      status === "Verified"
        ? "Business successfully approved."
        : "Business successfully rejected."
    );

    setSelectedBusiness(null);
    setShowRejectModal(false);
    setRejectionReason("");

    await loadDashboard();

    setReviewing(false);
    setReviewingId(null);
  }

  // OPEN PUBLIC REPORT DETAILS
  async function openPublicReport(report: PublicReport) {
    setSelectedPublicReport(report);
    setReportStatus(report.status);
    setReportNotes(report.admin_notes || "");
    setReportEvidenceUrl("");
    setError("");
    setEvidenceLoading(true);

    if (!report.evidence_url) {
      setEvidenceLoading(false);
      return;
    }

    const { data, error: storageError } = await supabase.storage
      .from("public-reports")
      .createSignedUrl(report.evidence_url, 600);

    if (storageError) {
      setError(storageError.message);
    } else {
      setReportEvidenceUrl(data.signedUrl);
    }

    setEvidenceLoading(false);
  }

  // UPDATE PUBLIC REPORT
  async function handlePublicReportUpdate() {
    if (!selectedPublicReport) return;

    setReportActionLoading(true);
    setError("");
    setSuccess("");

    const { error: updateError } = await supabase.rpc(
      "update_public_report",
      {
        p_report_id: selectedPublicReport.id,
        p_status: reportStatus,
        p_admin_notes: reportNotes.trim() || null,
      }
    );

    if (updateError) {
      setError(updateError.message);
      setReportActionLoading(false);
      return;
    }

    setSuccess("Public report successfully updated.");
    setSelectedPublicReport(null);
    setReportEvidenceUrl("");

    await loadDashboard();

    setReportActionLoading(false);
  }

  // CLOSE PUBLIC REPORT DETAILS
  function closePublicReport() {
    setSelectedPublicReport(null);
    setReportEvidenceUrl("");
    setReportNotes("");
    setReportStatus("Received");
    setEvidenceLoading(false);
  }

  // BUSINESS REJECTION MODAL
  function openRejectModal(business: Business) {
    setSelectedBusiness(business);
    setRejectionReason("");
    setShowRejectModal(true);
  }

  // MENU NAVIGATION
  function changeMenu(menu: Menu) {
    setActiveMenu(menu);
    setError("");
    setSuccess("");
    setSelectedBusiness(null);
    setShowRejectModal(false);
    closePublicReport();
  }

  // BUSINESS STATISTICS
  const totalBusinesses = businesses.length;

  const pendingBusinesses = businesses.filter(
    (business) => business.verification_status === "Pending"
  ).length;

  const verifiedBusinesses = businesses.filter(
    (business) => business.verification_status === "Verified"
  ).length;

  const rejectedBusinesses = businesses.filter(
    (business) => business.verification_status === "Rejected"
  ).length;

  // AGE VERIFICATION STATISTICS
  const filteredAgeVerifications = ageVerifications.filter((item) => {
    if (ageResultFilter === "All") return true;
    return item.verification_result === ageResultFilter;
  });

  const totalAgeVerifications = ageVerifications.length;

  const approvedAgeVerifications = ageVerifications.filter(
    (item) => item.verification_result === "Approved"
  ).length;

  const rejectedAgeVerifications = ageVerifications.filter(
    (item) => item.verification_result === "Rejected"
  ).length;

  // REPORT PERIOD FILTER
  const reportBusinesses = businesses.filter((business) => {
    const registrationDate = new Date(business.created_at);
    const now = new Date();

    let start: Date | null = null;
    let end: Date | null = null;

    if (reportPeriod === "today") {
      start = new Date(now);
      start.setHours(0, 0, 0, 0);

      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    }

    if (reportPeriod === "7days") {
      start = new Date(now);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);

      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    }

    if (reportPeriod === "30days") {
      start = new Date(now);
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);

      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    }

    if (reportPeriod === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      start.setHours(0, 0, 0, 0);

      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    }

    if (reportPeriod === "custom") {
      if (startDate) {
        start = new Date(`${startDate}T00:00:00`);
      }

      if (endDate) {
        end = new Date(`${endDate}T23:59:59.999`);
      }
    }

    const timestamp = registrationDate.getTime();

    if (start && timestamp < start.getTime()) return false;
    if (end && timestamp > end.getTime()) return false;

    return true;
  });

  const reportTotalBusinesses = reportBusinesses.length;

  const reportVerifiedBusinesses = reportBusinesses.filter(
    (business) => business.verification_status === "Verified"
  ).length;

  const reportPendingBusinesses = reportBusinesses.filter(
    (business) => business.verification_status === "Pending"
  ).length;

  const reportRejectedBusinesses = reportBusinesses.filter(
    (business) => business.verification_status === "Rejected"
  ).length;

  const cityCounts = reportBusinesses.reduce<Record<string, number>>(
    (result, business) => {
      const city = business.city || "Unknown";
      result[city] = (result[city] || 0) + 1;
      return result;
    },
    {}
  );

  const cityReports = Object.entries(cityCounts).sort(
    (a, b) => b[1] - a[1]
  );

  // EXPORT EXCEL
  function exportExcel() {
    const reportDate = new Date().toLocaleDateString("en-CA");

    const businessData = reportBusinesses.map((business, index) => ({
      No: index + 1,
      "Business Name": business.business_name,
      "Business Type": business.business_type,
      NIB: business.nib,
      "License Number": business.license_number || "-",
      Address: business.address,
      City: business.city,
      Province: business.province,
      "Postal Code": business.postal_code || "-",
      Phone: business.phone || "-",
      "Business Email": business.business_email || "-",
      "Verification Status": business.verification_status,
      "Rejection Reason": business.rejection_reason || "-",
      "Registration Date": new Date(
        business.created_at
      ).toLocaleDateString("en-GB"),
    }));

    const summaryData = [
      { Metric: "Total Businesses", Value: reportTotalBusinesses },
      { Metric: "Verified Businesses", Value: reportVerifiedBusinesses },
      { Metric: "Pending Businesses", Value: reportPendingBusinesses },
      { Metric: "Rejected Businesses", Value: reportRejectedBusinesses },
      { Metric: "Report Date", Value: reportDate },
    ];

    const cityData = cityReports.map(([city, count]) => ({
      City: city,
      "Number of Businesses": count,
      Percentage:
        reportTotalBusinesses > 0
          ? `${((count / reportTotalBusinesses) * 100).toFixed(1)}%`
          : "0%",
    }));

    const workbook = XLSX.utils.book_new();

    const businessSheet = XLSX.utils.json_to_sheet(businessData);
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    const citySheet = XLSX.utils.json_to_sheet(cityData);

    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");
    XLSX.utils.book_append_sheet(workbook, businessSheet, "Business Records");
    XLSX.utils.book_append_sheet(workbook, citySheet, "City Distribution");

    XLSX.writeFile(workbook, `VerAge_Report_${reportDate}.xlsx`);
  }

  // EXPORT PDF
  function exportPDF() {
    const reportDate = new Date().toLocaleDateString("en-GB");

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    doc.setFontSize(20);
    doc.setTextColor(84, 29, 46);
    doc.text("VerAge Government Report", 14, 18);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Report Date: ${reportDate}`, 14, 26);

    doc.setFontSize(11);
    doc.setTextColor(50, 39, 43);
    doc.text(`Total Businesses: ${reportTotalBusinesses}`, 14, 38);
    doc.text(`Verified: ${reportVerifiedBusinesses}`, 80, 38);
    doc.text(`Pending: ${reportPendingBusinesses}`, 135, 38);
    doc.text(`Rejected: ${reportRejectedBusinesses}`, 190, 38);

    autoTable(doc, {
      startY: 46,
      head: [[
        "No.",
        "Business Name",
        "Type",
        "NIB",
        "City",
        "Province",
        "Status",
        "Registration Date",
      ]],
      body: reportBusinesses.map((business, index) => [
        index + 1,
        business.business_name,
        business.business_type,
        business.nib,
        business.city,
        business.province,
        business.verification_status,
        new Date(business.created_at).toLocaleDateString("en-GB"),
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 3,
        overflow: "linebreak",
      },
      headStyles: {
        fillColor: [84, 29, 46],
        textColor: [255, 255, 255],
      },
      alternateRowStyles: {
        fillColor: [250, 248, 244],
      },
      margin: {
        left: 14,
        right: 14,
      },
    });

    doc.save(
      `VerAge_Report_${new Date().toLocaleDateString("en-CA")}.pdf`
    );
  }

  const menuItems: Menu[] = [
    "Overview",
    "Business Verification",
    "Outlet Monitoring",
    "Age Verification Monitoring",
    "Public Reports",
    "Reports",
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F4]">
        <p className="text-[#541D2E]">
          Loading Government Dashboard...
        </p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F4]">
        <p className="text-[#541D2E]">
          Access denied. Government account required.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F4] md:flex">

      {/* SIDEBAR */}
      <aside className="w-full bg-[#541D2E] p-6 text-white md:min-h-screen md:w-64 md:shrink-0">
        <h1
          className="mb-2 text-center text-3xl"
          style={{ fontFamily: "Cormorant Garamond, serif" }}
        >
          VerAge
        </h1>

        <p className="mb-10 text-center text-xs text-[#E9C98E]">
          GOVERNMENT CONTROL CENTER
        </p>

        <p className="mb-4 text-xs uppercase tracking-widest text-[#D7B98A]">
          Main Menu
        </p>

        <nav className="space-y-2">
          {menuItems.map((menu) => (
            <button
              key={menu}
              type="button"
              onClick={() => changeMenu(menu)}
              className={`w-full rounded-lg px-4 py-3 text-left text-sm font-medium transition ${
                activeMenu === menu
                  ? "bg-white/20 text-white"
                  : "text-white/65 hover:bg-white/10 hover:text-white"
              }`}
            >
              {menu === "Overview" && "▦ "}
              {menu === "Business Verification" && "▤ "}
              {menu === "Outlet Monitoring" && "⌖ "}
              {menu === "Age Verification Monitoring" && "◉ "}
              {menu === "Public Reports" && "▣ "}
              {menu === "Reports" && "▥ "}
              {menu}
            </button>
          ))}
        </nav>

        <div className="mt-12 border-t border-white/20 pt-6">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-4 py-3 text-left text-sm transition hover:bg-white/10"
          >
            ↪ Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="min-w-0 flex-1 p-6 md:p-10">

        {/* HEADER */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-[#8A7778]">
              VerAge / Government / {activeMenu}
            </p>

            <h2 className="mt-2 text-3xl font-semibold text-[#541D2E]">
              {activeMenu}
            </h2>

            <p className="mt-2 text-sm text-[#8A7778]">
              {activeMenu === "Overview" &&
                "Monitor and manage registered alcohol businesses."}

              {activeMenu === "Business Verification" &&
                "Review, approve, or reject business registrations."}

              {activeMenu === "Outlet Monitoring" &&
                "Monitor registered outlet locations across West Java."}

              {activeMenu === "Age Verification Monitoring" &&
                "Monitor age verification results submitted by registered outlets."}

              {activeMenu === "Public Reports" &&
                "Receive, review, and investigate public reports of suspected illegal alcohol outlets."}

              {activeMenu === "Reports" &&
                "View business registration and verification reports."}
            </p>
          </div>

          <button
            onClick={loadDashboard}
            className="rounded-lg border border-[#E9DED5] bg-white px-5 py-3 text-sm text-[#541D2E] hover:bg-[#F5EBDD]"
          >
            ↻ Refresh Data
          </button>
        </div>

        {/* NOTIFICATIONS */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* OVERVIEW */}
        {activeMenu === "Overview" && (
          <>
            <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-[#E9DED5] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#8A7778]">Total Businesses</p>
                <h3 className="mt-3 text-3xl font-semibold text-[#541D2E]">
                  {totalBusinesses}
                </h3>
                <p className="mt-2 text-xs text-[#8A7778]">
                  Registered businesses
                </p>
              </div>

              <div className="rounded-xl border border-[#E9DED5] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#8A7778]">
                  Pending Verification
                </p>
                <h3 className="mt-3 text-3xl font-semibold text-[#B68A45]">
                  {pendingBusinesses}
                </h3>
                <p className="mt-2 text-xs text-[#8A7778]">
                  Waiting for review
                </p>
              </div>

              <div className="rounded-xl border border-[#E9DED5] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#8A7778]">
                  Verified Businesses
                </p>
                <h3 className="mt-3 text-3xl font-semibold text-green-700">
                  {verifiedBusinesses}
                </h3>
                <p className="mt-2 text-xs text-[#8A7778]">
                  Successfully approved
                </p>
              </div>

              <div className="rounded-xl border border-[#E9DED5] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#8A7778]">
                  Rejected Businesses
                </p>
                <h3 className="mt-3 text-3xl font-semibold text-red-600">
                  {rejectedBusinesses}
                </h3>
                <p className="mt-2 text-xs text-[#8A7778]">
                  Applications rejected
                </p>
              </div>
            </div>

            <section className="rounded-xl border border-[#E9DED5] bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-[#541D2E]">
                Welcome to Government Control Center
              </h3>

              <p className="mt-2 text-sm text-[#8A7778]">
                Use the navigation menu to manage business verification,
                monitor outlet locations, and view system reports.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <button
                  onClick={() => changeMenu("Business Verification")}
                  className="rounded-lg border border-[#E9DED5] p-4 text-left hover:bg-[#FAF8F4]"
                >
                  <p className="font-semibold text-[#541D2E]">
                    Business Verification
                  </p>
                  <p className="mt-1 text-xs text-[#8A7778]">
                    {pendingBusinesses} applications waiting for review
                  </p>
                </button>

                <button
                  onClick={() => changeMenu("Outlet Monitoring")}
                  className="rounded-lg border border-[#E9DED5] p-4 text-left hover:bg-[#FAF8F4]"
                >
                  <p className="font-semibold text-[#541D2E]">
                    Outlet Monitoring
                  </p>
                  <p className="mt-1 text-xs text-[#8A7778]">
                    View outlet locations on the map
                  </p>
                </button>

                <button
                  onClick={() => changeMenu("Age Verification Monitoring")}
                  className="rounded-lg border border-[#E9DED5] p-4 text-left hover:bg-[#FAF8F4]"
                >
                  <p className="font-semibold text-[#541D2E]">
                    Age Verification Monitoring
                  </p>
                  <p className="mt-1 text-xs text-[#8A7778]">
                    {totalAgeVerifications} age checks recorded
                  </p>
                </button>

                <button
                  onClick={() => changeMenu("Public Reports")}
                  className="rounded-lg border border-[#E9DED5] p-4 text-left hover:bg-[#FAF8F4]"
                >
                  <p className="font-semibold text-[#541D2E]">
                    Public Reports
                  </p>
                  <p className="mt-1 text-xs text-[#8A7778]">
                    {publicReports.length} public reports received
                  </p>
                </button>

                <button
                  onClick={() => changeMenu("Reports")}
                  className="rounded-lg border border-[#E9DED5] p-4 text-left hover:bg-[#FAF8F4]"
                >
                  <p className="font-semibold text-[#541D2E]">
                    Reports
                  </p>
                  <p className="mt-1 text-xs text-[#8A7778]">
                    View business statistics and reports
                  </p>
                </button>
              </div>
            </section>
          </>
        )}

        {/* BUSINESS VERIFICATION */}
        {activeMenu === "Business Verification" && (
          <section className="overflow-hidden rounded-xl border border-[#E9DED5] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9DED5] p-6">
              <div>
                <h3 className="text-xl font-semibold text-[#541D2E]">
                  Business Registrations
                </h3>
                <p className="mt-1 text-sm text-[#8A7778]">
                  Review and manage registered businesses.
                </p>
              </div>

              <span className="text-sm text-[#8A7778]">
                {totalBusinesses} businesses
              </span>
            </div>

            {businesses.length === 0 ? (
              <div className="p-10 text-center">
                <p className="font-medium text-[#541D2E]">
                  No businesses registered yet.
                </p>
                <p className="mt-2 text-sm text-[#8A7778]">
                  New merchant registrations will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#FAF8F4]">
                    <tr className="text-xs uppercase tracking-wide text-[#8A7778]">
                      <th className="p-4">Business Name</th>
                      <th className="p-4">Business Type</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Registration Date</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {businesses.map((business) => (
                      <tr
                        key={business.id}
                        className="border-t border-[#E9DED5] text-sm"
                      >
                        <td className="p-4 font-medium text-[#541D2E]">
                          {business.business_name}
                        </td>

                        <td className="p-4 text-[#38272B]">
                          {business.business_type}
                        </td>

                        <td className="p-4 text-[#38272B]">
                          {business.city}, {business.province}
                        </td>

                        <td className="p-4 text-[#8A7778]">
                          {new Date(
                            business.created_at
                          ).toLocaleDateString("en-GB")}
                        </td>

                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              business.verification_status === "Verified"
                                ? "bg-green-100 text-green-700"
                                : business.verification_status === "Rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {business.verification_status}
                          </span>
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() => setSelectedBusiness(business)}
                            className="rounded-lg border border-[#B68A45] px-3 py-2 text-xs font-medium text-[#541D2E] hover:bg-[#F5EBDD]"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* OUTLET MONITORING */}
        {activeMenu === "Outlet Monitoring" && (
          <>
            <div className="mb-5 grid gap-5 sm:grid-cols-3">
              <div className="rounded-xl border border-[#E9DED5] bg-white p-5">
                <p className="text-sm text-[#8A7778]">Total Outlets</p>
                <p className="mt-2 text-3xl font-semibold text-[#541D2E]">
                  {totalBusinesses}
                </p>
              </div>

              <div className="rounded-xl border border-[#E9DED5] bg-white p-5">
                <p className="text-sm text-[#8A7778]">Verified Outlets</p>
                <p className="mt-2 text-3xl font-semibold text-green-700">
                  {verifiedBusinesses}
                </p>
              </div>

              <div className="rounded-xl border border-[#E9DED5] bg-white p-5">
                <p className="text-sm text-[#8A7778]">Pending Outlets</p>
                <p className="mt-2 text-3xl font-semibold text-[#B68A45]">
                  {pendingBusinesses}
                </p>
              </div>
            </div>

            <WestJavaMap />
          </>
        )}

        {/* AGE VERIFICATION MONITORING */}
        {activeMenu === "Age Verification Monitoring" && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
              <div className="rounded-xl border border-[#E9DED5] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#8A7778]">
                  Total Age Checks
                </p>
                <p className="mt-3 text-3xl font-semibold text-[#541D2E]">
                  {totalAgeVerifications}
                </p>
                <p className="mt-2 text-xs text-[#8A7778]">
                  All recorded checks
                </p>
              </div>

              <div className="rounded-xl border border-[#E9DED5] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#8A7778]">
                  Approved (21+)
                </p>
                <p className="mt-3 text-3xl font-semibold text-green-700">
                  {approvedAgeVerifications}
                </p>
                <p className="mt-2 text-xs text-[#8A7778]">
                  Age checks marked approved
                </p>
              </div>

              <div className="rounded-xl border border-[#E9DED5] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#8A7778]">
                  Rejected (Under 21)
                </p>
                <p className="mt-3 text-3xl font-semibold text-red-600">
                  {rejectedAgeVerifications}
                </p>
                <p className="mt-2 text-xs text-[#8A7778]">
                  Age checks marked rejected
                </p>
              </div>
            </div>

            <section className="overflow-hidden rounded-xl border border-[#E9DED5] bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E9DED5] p-6">
                <div>
                  <h3 className="text-xl font-semibold text-[#541D2E]">
                    Age Verification Records
                  </h3>
                  <p className="mt-1 text-sm text-[#8A7778]">
                    Monitor age checks submitted by registered outlets.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-medium text-[#8A7778]">
                    Filter Result
                  </label>

                  <select
                    value={ageResultFilter}
                    onChange={(e) => setAgeResultFilter(e.target.value)}
                    className="rounded-lg border border-[#E9DED5] bg-white px-4 py-2.5 text-sm text-[#541D2E] outline-none focus:border-[#B68A45]"
                  >
                    <option value="All">All Results</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              {filteredAgeVerifications.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-lg font-medium text-[#541D2E]">
                    No Age Verification Records
                  </p>
                  <p className="mt-2 text-sm text-[#8A7778]">
                    Completed age checks will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#FAF8F4]">
                      <tr className="text-xs uppercase tracking-wide text-[#8A7778]">
                        <th className="p-4">Date</th>
                        <th className="p-4">Business Outlet</th>
                        <th className="p-4">Location</th>
                        <th className="p-4">Age</th>
                        <th className="p-4">Result</th>
                        <th className="p-4">OCR</th>
                        <th className="p-4">Face Match</th>
                        <th className="p-4">Liveness</th>
                        <th className="p-4">Dukcapil</th>
                      </tr>
                    </thead>

                    <tbody>
                      {filteredAgeVerifications.map((item) => (
                        <tr
                          key={item.id}
                          className="border-t border-[#E9DED5] text-sm"
                        >
                          <td className="whitespace-nowrap p-4 text-[#8A7778]">
                            {new Date(
                              item.verification_date
                            ).toLocaleString("en-GB")}
                          </td>

                          <td className="p-4 font-medium text-[#541D2E]">
                            {item.businesses?.business_name || "Unknown Outlet"}
                          </td>

                          <td className="p-4 text-[#38272B]">
                            {item.businesses
                              ? `${item.businesses.city}, ${item.businesses.province}`
                              : "-"}
                          </td>

                          <td className="whitespace-nowrap p-4 font-medium text-[#38272B]">
                            {item.age} years
                          </td>

                          <td className="p-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${
                                item.verification_result === "Approved"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {item.verification_result}
                            </span>
                          </td>

                          <td className="p-4 text-[#38272B]">
                            {item.ocr_status}
                          </td>

                          <td className="p-4 text-[#38272B]">
                            {item.face_match_status}
                          </td>

                          <td className="p-4 text-[#38272B]">
                            {item.liveness_status}
                          </td>

                          <td className="p-4 text-[#38272B]">
                            {item.dukcapil_status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="border-t border-[#E9DED5] bg-[#FAF8F4] px-6 py-4">
                <p className="text-xs text-[#8A7778]">
                  Showing {filteredAgeVerifications.length} of{" "}
                  {totalAgeVerifications} age verification records.
                </p>
              </div>
            </section>
          </>
        )}

        {/* PUBLIC REPORTS */}
        {activeMenu === "Public Reports" && (
          <section className="overflow-hidden rounded-xl border border-[#E9DED5] bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E9DED5] p-6">
              <div>
                <h3 className="text-xl font-semibold text-[#541D2E]">
                  Public Violation Reports
                </h3>
                <p className="mt-1 text-sm text-[#8A7778]">
                  Reports submitted by the public regarding suspected illegal
                  alcohol outlets.
                </p>
              </div>

              <span className="rounded-full bg-[#F5EBDD] px-4 py-2 text-sm font-medium text-[#541D2E]">
                {publicReports.length} Reports
              </span>
            </div>

            {publicReports.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-lg font-medium text-[#541D2E]">
                  No Public Reports Yet
                </p>
                <p className="mt-2 text-sm text-[#8A7778]">
                  Reports submitted through the public reporting page will
                  appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#FAF8F4]">
                    <tr className="text-xs uppercase tracking-wide text-[#8A7778]">
                      <th className="p-4">Report Date</th>
                      <th className="p-4">Business Name</th>
                      <th className="p-4">Violation Type</th>
                      <th className="p-4">Location</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {publicReports.map((report) => (
                      <tr
                        key={report.id}
                        className="border-t border-[#E9DED5] text-sm"
                      >
                        <td className="p-4 text-[#8A7778]">
                          {new Date(
                            report.created_at
                          ).toLocaleDateString("en-GB")}
                        </td>

                        <td className="p-4 font-medium text-[#541D2E]">
                          {report.business_name || "Unknown Business"}
                        </td>

                        <td className="p-4 text-[#38272B]">
                          {report.violation_type}
                        </td>

                        <td className="p-4 text-[#38272B]">
                          {report.city}, {report.province}
                        </td>

                        <td className="p-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-medium ${
                              report.status === "Resolved"
                                ? "bg-green-100 text-green-700"
                                : report.status === "Dismissed"
                                ? "bg-gray-100 text-gray-600"
                                : report.status === "Investigating"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                          >
                            {report.status}
                          </span>
                        </td>

                        <td className="p-4">
                          <button
                            onClick={() => openPublicReport(report)}
                            className="rounded-lg border border-[#B68A45] px-3 py-2 text-xs font-medium text-[#541D2E] hover:bg-[#F5EBDD]"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* REPORTS */}
        {activeMenu === "Reports" && (
          <>
            <section className="mb-6 rounded-xl border border-[#E9DED5] bg-white p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-[#541D2E]">
                Report Period Filter
              </h3>

              <p className="mt-1 text-sm text-[#8A7778]">
                Select the registration period for your report.
              </p>

              <div className="mt-5 flex flex-wrap items-end gap-4">
                <div className="min-w-52">
                  <label className="mb-2 block text-sm font-medium text-[#38272B]">
                    Select Period
                  </label>

                  <select
                    value={reportPeriod}
                    onChange={(e) =>
                      setReportPeriod(e.target.value as typeof reportPeriod)
                    }
                    className="w-full rounded-lg border border-[#E9DED5] bg-white px-4 py-3 text-sm text-[#541D2E] outline-none focus:border-[#B68A45]"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="7days">Last 7 Days</option>
                    <option value="30days">Last 30 Days</option>
                    <option value="month">This Month</option>
                    <option value="custom">Custom Date Range</option>
                  </select>
                </div>

                {reportPeriod === "custom" && (
                  <>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#38272B]">
                        Start Date
                      </label>
                      <input
                        type="date"
                        value={startDate}
                        max={endDate || undefined}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="rounded-lg border border-[#E9DED5] px-4 py-3 text-sm text-[#541D2E]"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-medium text-[#38272B]">
                        End Date
                      </label>
                      <input
                        type="date"
                        value={endDate}
                        min={startDate || undefined}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="rounded-lg border border-[#E9DED5] px-4 py-3 text-sm text-[#541D2E]"
                      />
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setReportPeriod("all");
                    setStartDate("");
                    setEndDate("");
                  }}
                  className="rounded-lg border border-[#B68A45] px-4 py-3 text-sm text-[#541D2E] hover:bg-[#F5EBDD]"
                >
                  Reset Filter
                </button>
              </div>

              <p className="mt-4 text-xs text-[#8A7778]">
                Showing {reportTotalBusinesses} business records.
              </p>
            </section>

            <div className="mb-6 flex flex-wrap gap-3">
              <button
                onClick={exportExcel}
                className="rounded-lg bg-[#541D2E] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#713247]"
              >
                ↓ Export Excel
              </button>

              <button
                onClick={exportPDF}
                className="rounded-lg border border-[#B68A45] bg-white px-5 py-3 text-sm font-medium text-[#541D2E] transition hover:bg-[#F5EBDD]"
              >
                ↓ Export PDF
              </button>
            </div>

            <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-[#E9DED5] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#8A7778]">Total Businesses</p>
                <p className="mt-3 text-3xl font-semibold text-[#541D2E]">
                  {reportTotalBusinesses}
                </p>
              </div>

              <div className="rounded-xl border border-[#E9DED5] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#8A7778]">Verified</p>
                <p className="mt-3 text-3xl font-semibold text-green-700">
                  {reportVerifiedBusinesses}
                </p>
              </div>

              <div className="rounded-xl border border-[#E9DED5] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#8A7778]">Pending</p>
                <p className="mt-3 text-3xl font-semibold text-[#B68A45]">
                  {reportPendingBusinesses}
                </p>
              </div>

              <div className="rounded-xl border border-[#E9DED5] bg-white p-6 shadow-sm">
                <p className="text-sm text-[#8A7778]">Rejected</p>
                <p className="mt-3 text-3xl font-semibold text-red-600">
                  {reportRejectedBusinesses}
                </p>
              </div>
            </div>

            <section className="mb-6 rounded-xl border border-[#E9DED5] bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-[#541D2E]">
                Verification Summary
              </h3>

              <p className="mt-1 text-sm text-[#8A7778]">
                Business registration status for the selected period.
              </p>

              <div className="mt-6 space-y-5">
                {[
                  {
                    label: "Verified",
                    count: reportVerifiedBusinesses,
                    color: "bg-green-600",
                  },
                  {
                    label: "Pending",
                    count: reportPendingBusinesses,
                    color: "bg-[#B68A45]",
                  },
                  {
                    label: "Rejected",
                    count: reportRejectedBusinesses,
                    color: "bg-red-600",
                  },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-[#38272B]">{item.label}</span>
                      <span className="font-semibold text-[#541D2E]">
                        {item.count}
                      </span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-[#F5EBDD]">
                      <div
                        className={`h-full rounded-full ${item.color}`}
                        style={{
                          width:
                            reportTotalBusinesses > 0
                              ? `${
                                  (item.count / reportTotalBusinesses) * 100
                                }%`
                              : "0%",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-[#E9DED5] bg-white shadow-sm">
              <div className="border-b border-[#E9DED5] p-6">
                <h3 className="text-xl font-semibold text-[#541D2E]">
                  Businesses by City
                </h3>
                <p className="mt-1 text-sm text-[#8A7778]">
                  Distribution of registered businesses by city.
                </p>
              </div>

              {cityReports.length === 0 ? (
                <p className="p-8 text-center text-sm text-[#8A7778]">
                  No report data available.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#FAF8F4]">
                      <tr className="text-xs uppercase tracking-wide text-[#8A7778]">
                        <th className="p-4">City</th>
                        <th className="p-4">Number of Businesses</th>
                        <th className="p-4">Percentage</th>
                      </tr>
                    </thead>

                    <tbody>
                      {cityReports.map(([city, count]) => (
                        <tr
                          key={city}
                          className="border-t border-[#E9DED5] text-sm"
                        >
                          <td className="p-4 font-medium text-[#541D2E]">
                            {city}
                          </td>
                          <td className="p-4 text-[#38272B]">{count}</td>
                          <td className="p-4 text-[#38272B]">
                            {reportTotalBusinesses > 0
                              ? `${(
                                  (count / reportTotalBusinesses) *
                                  100
                                ).toFixed(1)}%`
                              : "0%"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <p className="mt-5 text-xs text-[#8A7778]">
              Reports are calculated from the current business records in
              Supabase.
            </p>
          </>
        )}

        <p className="mt-8 text-center text-xs text-[#8A7778]">
          VerAge Integrated Alcohol Control System
        </p>
      </main>

      {/* BUSINESS DETAIL MODAL */}
      {selectedBusiness && !showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-[#E9DED5] pb-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#B68A45]">
                  Business Registration Details
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-[#541D2E]">
                  {selectedBusiness.business_name}
                </h2>
              </div>

              <button
                onClick={() => setSelectedBusiness(null)}
                className="text-2xl text-[#8A7778] hover:text-[#541D2E]"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {[
                ["Business Type", selectedBusiness.business_type],
                ["NIB", selectedBusiness.nib],
                ["License Number", selectedBusiness.license_number],
                ["Business Email", selectedBusiness.business_email],
                ["Phone Number", selectedBusiness.phone],
                ["Postal Code", selectedBusiness.postal_code],
                ["City", selectedBusiness.city],
                ["Province", selectedBusiness.province],
                ["Address", selectedBusiness.address],
                [
                  "Registration Date",
                  new Date(selectedBusiness.created_at).toLocaleDateString(
                    "en-GB"
                  ),
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-[#8A7778]">{label}</p>
                  <p className="mt-1 break-words text-sm font-medium text-[#38272B]">
                    {value || "-"}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-lg bg-[#FAF8F4] p-4">
              <p className="text-xs text-[#8A7778]">
                Current Verification Status
              </p>

              <p className="mt-1 font-semibold text-[#541D2E]">
                {selectedBusiness.verification_status}
              </p>

              {selectedBusiness.rejection_reason && (
                <p className="mt-3 text-sm text-red-700">
                  Rejection reason: {selectedBusiness.rejection_reason}
                </p>
              )}
            </div>

            {selectedBusiness.verification_status === "Pending" && (
              <div className="mt-7 flex flex-wrap justify-end gap-3 border-t border-[#E9DED5] pt-6">
                <button
                  onClick={() => openRejectModal(selectedBusiness)}
                  disabled={reviewing}
                  className="rounded-lg border border-red-300 px-5 py-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Reject
                </button>

                <button
                  onClick={() =>
                    handleReview(selectedBusiness.id, "Verified")
                  }
                  disabled={reviewing}
                  className="rounded-lg bg-[#541D2E] px-5 py-3 text-sm font-medium text-white hover:bg-[#713247] disabled:opacity-50"
                >
                  {reviewing && reviewingId === selectedBusiness.id
                    ? "Processing..."
                    : "Approve Business"}
                </button>
              </div>
            )}

            {selectedBusiness.verification_status !== "Pending" && (
              <div className="mt-7 border-t border-[#E9DED5] pt-5 text-right">
                <button
                  onClick={() => setSelectedBusiness(null)}
                  className="rounded-lg bg-[#541D2E] px-5 py-3 text-sm text-white"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* REJECTION MODAL */}
      {showRejectModal && selectedBusiness && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 md:p-8">
            <h2 className="text-2xl font-semibold text-[#541D2E]">
              Reject Business
            </h2>

            <p className="mt-2 text-sm text-[#8A7778]">
              You are rejecting the registration of{" "}
              <strong>{selectedBusiness.business_name}</strong>. Please
              provide a reason.
            </p>

            <label className="mt-6 block text-sm font-medium text-[#38272B]">
              Rejection Reason
            </label>

            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              placeholder="Explain why this business registration is rejected..."
              className="mt-2 w-full rounded-lg border border-[#E9DED5] p-3 text-sm outline-none focus:border-[#B68A45]"
            />

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                disabled={reviewing}
                className="rounded-lg border border-[#E9DED5] px-5 py-3 text-sm text-[#541D2E]"
              >
                Cancel
              </button>

              <button
                onClick={() =>
                  handleReview(
                    selectedBusiness.id,
                    "Rejected",
                    rejectionReason
                  )
                }
                disabled={reviewing || !rejectionReason.trim()}
                className="rounded-lg bg-red-700 px-5 py-3 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
              >
                {reviewing ? "Processing..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PUBLIC REPORT DETAIL MODAL */}
      {selectedPublicReport && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 md:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-[#E9DED5] pb-5">
              <div>
                <p className="text-xs uppercase tracking-widest text-[#B68A45]">
                  Public Violation Report
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-[#541D2E]">
                  Report Details
                </h2>

                <p className="mt-1 text-sm text-[#8A7778]">
                  Submitted on{" "}
                  {new Date(
                    selectedPublicReport.created_at
                  ).toLocaleString("en-GB")}
                </p>
              </div>

              <button
                onClick={closePublicReport}
                className="text-2xl text-[#8A7778] hover:text-[#541D2E]"
              >
                ×
              </button>
            </div>

            {/* REPORT INFORMATION */}
            <div className="mt-6">
              <h3 className="mb-4 text-lg font-semibold text-[#541D2E]">
                Report Information
              </h3>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-[#8A7778]">Business Name</p>
                  <p className="mt-1 text-sm font-medium text-[#38272B]">
                    {selectedPublicReport.business_name || "Unknown Business"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[#8A7778]">Violation Type</p>
                  <p className="mt-1 text-sm font-medium text-[#38272B]">
                    {selectedPublicReport.violation_type}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[#8A7778]">City</p>
                  <p className="mt-1 text-sm font-medium text-[#38272B]">
                    {selectedPublicReport.city}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[#8A7778]">Province</p>
                  <p className="mt-1 text-sm font-medium text-[#38272B]">
                    {selectedPublicReport.province}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-xs text-[#8A7778]">Business Address</p>
                  <p className="mt-1 text-sm font-medium text-[#38272B]">
                    {selectedPublicReport.business_address}
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <p className="text-xs text-[#8A7778]">Description</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-[#38272B]">
                    {selectedPublicReport.description}
                  </p>
                </div>
              </div>
            </div>

            {/* REPORTER INFORMATION */}
            <div className="mt-7 border-t border-[#E9DED5] pt-6">
              <h3 className="mb-4 text-lg font-semibold text-[#541D2E]">
                Reporter Information
              </h3>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-[#8A7778]">Reporter Name</p>
                  <p className="mt-1 text-sm font-medium text-[#38272B]">
                    {selectedPublicReport.reporter_name || "Not provided"}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-[#8A7778]">Contact Information</p>
                  <p className="mt-1 break-words text-sm font-medium text-[#38272B]">
                    {selectedPublicReport.reporter_contact || "Not provided"}
                  </p>
                </div>
              </div>
            </div>

            {/* EVIDENCE PHOTO */}
            <div className="mt-7 border-t border-[#E9DED5] pt-6">
              <h3 className="mb-3 text-lg font-semibold text-[#541D2E]">
                Evidence Photo
              </h3>

              {evidenceLoading ? (
                <p className="text-sm text-[#8A7778]">
                  Loading evidence photo...
                </p>
              ) : reportEvidenceUrl ? (
                <img
                  src={reportEvidenceUrl}
                  alt="Public report evidence"
                  className="max-h-96 w-full rounded-xl border border-[#E9DED5] bg-[#FAF8F4] object-contain"
                />
              ) : (
                <p className="rounded-lg bg-[#FAF8F4] p-4 text-sm text-[#8A7778]">
                  Evidence photo is unavailable.
                </p>
              )}
            </div>

            {/* GOVERNMENT ACTION */}
            <div className="mt-7 border-t border-[#E9DED5] pt-6">
              <h3 className="mb-4 text-lg font-semibold text-[#541D2E]">
                Government Review
              </h3>

              <label className="mb-2 block text-sm font-medium text-[#38272B]">
                Report Status
              </label>

              <select
                value={reportStatus}
                onChange={(e) => setReportStatus(e.target.value)}
                className="w-full rounded-lg border border-[#E9DED5] bg-white px-4 py-3 text-sm text-[#541D2E] outline-none focus:border-[#B68A45]"
              >
                <option value="Received">Received</option>
                <option value="Under Review">Under Review</option>
                <option value="Investigating">Investigating</option>
                <option value="Resolved">Resolved</option>
                <option value="Dismissed">Dismissed</option>
              </select>

              <label className="mb-2 mt-5 block text-sm font-medium text-[#38272B]">
                Government Notes
              </label>

              <textarea
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                rows={4}
                maxLength={5000}
                placeholder="Write investigation notes or follow-up information..."
                className="w-full rounded-lg border border-[#E9DED5] p-3 text-sm text-[#38272B] outline-none focus:border-[#B68A45]"
              />

              <p className="mt-1 text-right text-xs text-[#8A7778]">
                {reportNotes.length}/5000 characters
              </p>

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  onClick={closePublicReport}
                  disabled={reportActionLoading}
                  className="rounded-lg border border-[#E9DED5] px-5 py-3 text-sm text-[#541D2E] hover:bg-[#FAF8F4] disabled:opacity-50"
                >
                  Close
                </button>

                <button
                  onClick={handlePublicReportUpdate}
                  disabled={reportActionLoading || evidenceLoading}
                  className="rounded-lg bg-[#541D2E] px-5 py-3 text-sm font-medium text-white hover:bg-[#713247] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {reportActionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
