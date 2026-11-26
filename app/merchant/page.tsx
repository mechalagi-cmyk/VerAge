
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

const WestJavaMap = dynamic(
  () => import("../components/maps/WestJavaMap"),
  {
    ssr: false,
    loading: () => (
      <div className="mt-8 rounded-2xl bg-white p-8 text-center text-gray-500">
        Loading outlet map...
      </div>
    ),
  }
);

const menuItems = [
  "Overview",
  "Business Profile",
  "Age Verification",
  "Transaction History",
];

type Business = {
  id: string;
  business_name: string;
  verification_status: string;
};

type Verification = {
  id: string;
  business_id: string;
  buyer_reference: string | null;
  birth_date: string;
  age: number;
  verification_result: string;
  verification_date: string;
};

export default function MerchantDashboard() {
  const supabase = createClient();
  const router = useRouter();

  const [menu, setMenu] = useState("Overview");
  const [email, setEmail] = useState("");
  const [accountLoading, setAccountLoading] = useState(false);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState("");

  const [birthDate, setBirthDate] = useState("");
  const [buyerReference, setBuyerReference] = useState("");

  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [saving, setSaving] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "success" | "error" | ""
  >("");

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  async function loadUser() {
    setAccountLoading(true);
    setDataLoading(true);

    try {
      const { data, error } = await supabase.auth.getUser();

      if (error || !data.user) {
        console.error("Failed to load account:", error?.message);
        return;
      }

      const user = data.user;
      setEmail(user.email || "");

      const { data: businessData, error: businessError } =
        await supabase
          .from("businesses")
          .select("id, business_name, verification_status")
          .eq("user_id", user.id)
          .eq("verification_status", "Verified")
          .order("created_at", { ascending: false });

      if (businessError) {
        console.error("Failed to load businesses:", businessError.message);
      } else {
        setBusinesses(businessData || []);

        if (businessData && businessData.length > 0) {
          setSelectedBusiness((current) =>
            current || businessData[0].id
          );
        }
      }

      await loadVerifications(user.id);
    } catch (error) {
      console.error("Account loading error:", error);
    } finally {
      setAccountLoading(false);
      setDataLoading(false);
    }
  }

  async function loadVerifications(merchantId?: string) {
    let userId = merchantId;

    if (!userId) {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id;
    }

    if (!userId) return;

    const { data, error } = await supabase
      .from("age_verifications")
      .select("*")
      .eq("merchant_id", userId)
      .order("verification_date", { ascending: false });

    if (error) {
      console.error("Failed to load verifications:", error.message);
      return;
    }

    setVerifications(data || []);
  }

  useEffect(() => {
    loadUser();
  }, []);

  async function handleAgeVerification() {
    setMessage("");
    setMessageType("");

    if (!selectedBusiness) {
      setMessage("Please select a verified business outlet.");
      setMessageType("error");
      return;
    }

    if (!birthDate) {
      setMessage("Please enter the buyer's date of birth.");
      setMessageType("error");
      return;
    }

    if (birthDate > new Date().toLocaleDateString("en-CA")) {
      setMessage("Date of birth cannot be in the future.");
      setMessageType("error");
      return;
    }

    setSaving(true);

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const { data, error } = await supabase
        .from("age_verifications")
        .insert({
          business_id: selectedBusiness,
          merchant_id: userData.user.id,
          birth_date: birthDate,
          buyer_reference: buyerReference.trim() || null,
          age: 0,
          verification_result: "Rejected",
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      const result = data.verification_result;

      setMessage(
        result === "Approved"
          ? `Age verification approved. Buyer is ${data.age} years old.`
          : `Age verification rejected. Buyer is ${data.age} years old and below the minimum age of 21.`
      );

      setMessageType("success");

      setBirthDate("");
      setBuyerReference("");

      await loadVerifications(userData.user.id);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to save age verification.";

      setMessage(errorMessage);
      setMessageType("error");
    } finally {
      setSaving(false);
    }
  }

  const selectedBusinessName =
    businesses.find((business) => business.id === selectedBusiness)
      ?.business_name || "";

  return (
    <main className="min-h-screen bg-[#FAF8F4] text-[#38272B]">

      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 z-20 hidden h-screen w-64 flex-col bg-[#541D2E] px-6 py-8 shadow-xl md:flex">

        <div>
          <h1
            className="text-4xl font-medium tracking-tight text-white"
            style={{ fontFamily: '"Cormorant Garamond", serif' }}
          >
            VerAge
          </h1>

          <div className="mt-2 h-[2px] w-12 bg-[#B68A45]" />

          <p className="mt-3 text-[10px] font-bold tracking-[2.5px] text-[#D9BD8C]">
            MERCHANT PORTAL
          </p>
        </div>

        <nav className="mt-14 flex-1 space-y-2">
          <p className="mb-4 px-3 text-[10px] font-bold tracking-[2px] text-[#C9A77B]">
            WORKSPACE
          </p>

          {menuItems.map((item) => (
            <button
              key={item}

onClick={() => {
  if (item === "Business Profile") {
    router.push("/merchant/register");
  } else if (item === "Age Verification") {
    router.push("/merchant/age-verification");
  } else {
    setMenu(item);
    setMessage("");
  }
}}

              className={`w-full rounded-lg px-4 py-3.5 text-left text-sm font-medium transition-all duration-200 ${
                menu === item
                  ? "border border-[#B68A45]/40 bg-[#B68A45] text-white shadow-md"
                  : "text-[#E9DDE0] hover:bg-white/10 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="border-t border-white/15 pt-6">
          <button
            onClick={handleLogout}
            className="w-full rounded-lg px-4 py-3 text-left text-sm font-medium text-[#E9DDE0] transition hover:bg-white/10 hover:text-white"
          >
            Sign Out
          </button>

          <p className="mt-5 px-4 text-[10px] tracking-wide text-[#C9A77B]">
            VERAGE © 2026
          </p>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <section className="min-h-screen md:ml-64">

        {/* HEADER */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E9DED5] bg-white/95 px-6 py-5 backdrop-blur-md md:px-10">

          <div>
            <p className="text-xs font-medium tracking-wide text-[#8A7778]">
              MERCHANT PORTAL / {menu.toUpperCase()}
            </p>

            <h2 className="mt-1 text-xl font-semibold text-[#541D2E]">
              {menu}
            </h2>
          </div>

          <button
            onClick={loadUser}
            disabled={accountLoading}
            className="max-w-[180px] truncate rounded-lg border border-[#E9DED5] bg-[#FAF8F4] px-4 py-2.5 text-xs font-semibold text-[#541D2E] transition hover:border-[#B68A45] hover:bg-[#F5EBDD] disabled:cursor-wait disabled:opacity-60"
          >
            {accountLoading
              ? "Loading..."
              : email || "Load Account"}
          </button>
        </header>

        {/* DASHBOARD */}
        <div className="px-6 py-9 md:px-10 md:py-12">

          {/* INTRODUCTION */}
          <div className="mb-9">
            <p className="text-xs font-bold tracking-[2px] text-[#B68A45]">
              WELCOME TO VERAGE
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#541D2E] md:text-4xl">
              Merchant Dashboard
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-[#8A7778]">
              Manage your business, monitor age verification,
              and review your activity through the VerAge platform.
            </p>
          </div>

          {/* STATISTICS */}
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">

            {[
              {
                title: "Business Status",
                value: businesses.length > 0 ? "Verified" : "Not Verified",
                description: "Your verified business outlets",
              },
              {
                title: "Age Verification",
                value: String(verifications.length),
                description: "Total verification records",
              },
              {
                title: "Total Transactions",
                value: "0",
                description: "Recorded transactions",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group rounded-2xl border border-[#E9DED5] bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-[#C49A54] hover:shadow-lg"
              >
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-sm font-medium text-[#8A7778]">
                    {item.title}
                  </p>

                  <div className="h-2 w-2 rounded-full bg-[#B68A45]" />
                </div>

                <h3 className="text-2xl font-semibold text-[#541D2E]">
                  {item.value}
                </h3>

                <p className="mt-2 text-xs text-[#A39391]">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          {/* MAP SECTION */}
          <div className="mt-10">
            <div className="mb-5">
              <p className="text-[10px] font-bold tracking-[2px] text-[#B68A45]">
                LOCATION MONITORING
              </p>

              <h2 className="mt-2 text-xl font-semibold text-[#541D2E]">
                West Java Outlet Map
              </h2>

              <p className="mt-2 text-sm text-[#8A7778]">
                Monitor the location and registration status of business outlets.
              </p>
            </div>

            <div className="overflow-hidden rounded-2xl border border-[#E9DED5] bg-white p-2 shadow-sm">
              <WestJavaMap />
            </div>
          </div>

          {/* AGE VERIFICATION */}
          {menu === "Age Verification" && (
            <div className="mt-10 space-y-8">

              <div className="rounded-2xl border border-[#E9DED5] bg-white p-7 shadow-sm md:p-9">

                <p className="text-[10px] font-bold tracking-[2px] text-[#B68A45]">
                  BUYER AGE CHECK
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-[#541D2E]">
                  Age Verification
                </h2>

                <p className="mt-2 text-sm leading-7 text-[#8A7778]">
                  Verify whether a buyer meets the minimum legal age
                  requirement set by VerAge: 21 years old.
                </p>

                {businesses.length === 0 ? (
                  <div className="mt-7 rounded-xl border border-[#E9DED5] bg-[#FAF8F4] p-6">
                    <p className="font-semibold text-[#541D2E]">
                      No verified outlet available
                    </p>

                    <p className="mt-2 text-sm text-[#8A7778]">
                      You need a business outlet with Verified status
                      before performing age verification.
                    </p>

                    <button
                      onClick={() => router.push("/merchant/register")}
                      className="mt-5 rounded-lg bg-[#541D2E] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#713247]"
                    >
                      Open Business Profile
                    </button>
                  </div>
                ) : (
                  <div className="mt-7 max-w-xl space-y-5">

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#541D2E]">
                        Business Outlet
                      </label>

                      <select
                        value={selectedBusiness}
                        onChange={(e) =>
                          setSelectedBusiness(e.target.value)
                        }
                        className="w-full rounded-lg border border-[#E9DED5] bg-[#FAF8F4] px-4 py-3 text-sm outline-none focus:border-[#B68A45]"
                      >
                        {businesses.map((business) => (
                          <option
                            key={business.id}
                            value={business.id}
                          >
                            {business.business_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#541D2E]">
                        Buyer Reference (Optional)
                      </label>

                      <input
                        type="text"
                        value={buyerReference}
                        onChange={(e) =>
                          setBuyerReference(e.target.value)
                        }
                        maxLength={100}
                        placeholder="Example: Customer 001"
                        className="w-full rounded-lg border border-[#E9DED5] bg-[#FAF8F4] px-4 py-3 text-sm outline-none focus:border-[#B68A45]"
                      />

                      <p className="mt-1 text-xs text-[#A39391]">
                        Do not enter the buyer's full name or identity number.
                      </p>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-[#541D2E]">
                        Buyer's Date of Birth
                      </label>

                      <input
                        type="date"
                        value={birthDate}
                        max={new Date().toLocaleDateString("en-CA")}
                        onChange={(e) =>
                          setBirthDate(e.target.value)
                        }
                        className="w-full rounded-lg border border-[#E9DED5] bg-[#FAF8F4] px-4 py-3 text-sm outline-none focus:border-[#B68A45]"
                      />
                    </div>

                    <div className="rounded-xl border border-[#E9DED5] bg-[#FAF8F4] p-4">
                      <p className="text-xs font-bold tracking-wide text-[#B68A45]">
                        VERAGE AGE REQUIREMENT
                      </p>

                      <p className="mt-1 text-lg font-semibold text-[#541D2E]">
                        Minimum 21 Years Old
                      </p>
                    </div>

                    {message && (
                      <div
                        className={`rounded-lg border p-4 text-sm ${
                          messageType === "success"
                            ? "border-green-200 bg-green-50 text-green-800"
                            : "border-red-200 bg-red-50 text-red-800"
                        }`}
                      >
                        {message}
                      </div>
                    )}

                    <button
                      onClick={handleAgeVerification}
                      disabled={saving}
                      className="w-full rounded-lg bg-[#541D2E] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#713247] disabled:cursor-wait disabled:opacity-60"
                    >
                      {saving ? "Verifying..." : "Verify Age"}
                    </button>
                  </div>
                )}
              </div>

              {/* VERIFICATION HISTORY */}
              <div className="rounded-2xl border border-[#E9DED5] bg-white p-7 shadow-sm md:p-9">

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold tracking-[2px] text-[#B68A45]">
                      RECORDS
                    </p>

                    <h2 className="mt-2 text-xl font-semibold text-[#541D2E]">
                      Verification History
                    </h2>
                  </div>

                  <button
                    onClick={() => loadVerifications()}
                    className="rounded-lg border border-[#E9DED5] px-4 py-2 text-xs font-semibold text-[#541D2E] hover:bg-[#FAF8F4]"
                  >
                    Refresh
                  </button>
                </div>

                {dataLoading ? (
                  <p className="mt-6 text-sm text-[#8A7778]">
                    Loading verification records...
                  </p>
                ) : verifications.length === 0 ? (
                  <div className="mt-6 rounded-xl bg-[#FAF8F4] p-6 text-center">
                    <p className="text-sm text-[#8A7778]">
                      No age verification records yet.
                    </p>
                  </div>
                ) : (
                  <div className="mt-6 overflow-x-auto">
                    <table className="w-full min-w-[650px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-[#E9DED5] text-xs text-[#8A7778]">
                          <th className="px-3 py-4">Date</th>
                          <th className="px-3 py-4">Outlet</th>
                          <th className="px-3 py-4">Reference</th>
                          <th className="px-3 py-4">Age</th>
                          <th className="px-3 py-4">Result</th>
                        </tr>
                      </thead>

                      <tbody>
                        {verifications.map((record) => (
                          <tr
                            key={record.id}
                            className="border-b border-[#F0E9E3] last:border-0"
                          >
                            <td className="px-3 py-4 text-[#8A7778]">
                              {new Date(
                                record.verification_date
                              ).toLocaleString("en-GB")}
                            </td>

                            <td className="px-3 py-4 font-medium text-[#541D2E]">
                              {businesses.find(
                                (business) =>
                                  business.id === record.business_id
                              )?.business_name || "Business outlet"}
                            </td>

                            <td className="px-3 py-4 text-[#8A7778]">
                              {record.buyer_reference || "-"}
                            </td>

                            <td className="px-3 py-4 font-semibold text-[#541D2E]">
                              {record.age} years
                            </td>

                            <td className="px-3 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  record.verification_result === "Approved"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {record.verification_result}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* OTHER MENU CONTENT */}
          {menu !== "Age Verification" && (
            <div className="mt-10 rounded-2xl border border-[#E9DED5] bg-white p-7 shadow-sm md:p-9">

              <div className="flex items-center gap-3">
                <div className="h-7 w-1 rounded-full bg-[#B68A45]" />

                <h2 className="text-lg font-semibold text-[#541D2E]">
                  {menu}
                </h2>
              </div>

              <p className="mt-4 text-sm leading-7 text-[#8A7778]">
                {menu === "Overview"
                  ? "Your business activity and compliance information will appear here."
                  : "Transaction History will be developed in the next step."}
              </p>
            </div>
          )}

        </div>
      </section>
    </main>
  );
}
