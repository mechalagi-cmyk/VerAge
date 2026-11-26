
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

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
  latitude: number | null;
  longitude: number | null;
  verification_status: "Pending" | "Verified" | "Rejected";
  rejection_reason: string | null;
  created_at: string;
};

export default function BusinessRegistration() {
  const supabase = createClient();
  const router = useRouter();

const [business, setBusiness] = useState<Business | null>(null);
const [loadingProfile, setLoadingProfile] = useState(true);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");
const [loginRequired, setLoginRequired] = useState(false);

  useEffect(() => {
    async function loadBusiness() {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();

      if (userError || !userData.user) {
        setLoginRequired(true);
        setLoadingProfile(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("businesses")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setBusiness(data as Business | null);
      }

      setLoadingProfile(false);
    }

    loadBusiness();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);

    const { data: userData, error: userError } =
      await supabase.auth.getUser();

    if (userError || !userData.user) {
      setError("Please login first to register your business.");
      setLoading(false);
      return;
    }

    const latitudeRaw = formData.get("latitude") as string;
    const longitudeRaw = formData.get("longitude") as string;

    if (
      (latitudeRaw && !longitudeRaw) ||
      (!latitudeRaw && longitudeRaw)
    ) {
      setError("Please enter both latitude and longitude.");
      setLoading(false);
      return;
    }

    const latitude = latitudeRaw ? Number(latitudeRaw) : null;
    const longitude = longitudeRaw ? Number(longitudeRaw) : null;

    if (
      (latitude !== null &&
        (!Number.isFinite(latitude) || latitude < -90 || latitude > 90)) ||
      (longitude !== null &&
        (!Number.isFinite(longitude) ||
          longitude < -180 ||
          longitude > 180))
    ) {
      setError("Invalid latitude or longitude.");
      setLoading(false);
      return;
    }

    const businessData = {
      user_id: userData.user.id,
      business_name: formData.get("business_name") as string,
      business_type: formData.get("business_type") as string,
      nib: formData.get("nib") as string,
      license_number: formData.get("license_number") as string,
      address: formData.get("address") as string,
      province: formData.get("province") as string,
      city: formData.get("city") as string,
      postal_code: formData.get("postal_code") as string,
      phone: formData.get("phone") as string,
      business_email: formData.get("business_email") as string,
      latitude,
      longitude,
    };

    const { data, error: insertError } = await supabase
      .from("businesses")
      .insert(businessData)
      .select("*")
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setBusiness(data as Business);
    setLoading(false);
  }

  const inputClass =
    "w-full rounded-lg border border-[#E9DED5] bg-white px-4 py-3 outline-none focus:border-[#541D2E]";

  if (loadingProfile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF8F4]">
        <p className="text-[#8A7778]">Loading business profile...</p>
      </main>
    );
  }

  if (loginRequired) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FAF8F4] px-5">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="font-serif text-3xl text-[#541D2E]">
            Login Required
          </h1>
          <p className="mt-3 text-sm text-[#8A7778]">
            Please login to access your business profile.
          </p>
          <button
            onClick={() => router.push("/login")}
            className="mt-6 rounded-xl bg-[#541D2E] px-6 py-3 text-white"
          >
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FAF8F4] px-5 py-10 md:px-10">
      <div className="mx-auto max-w-3xl">
        <button
          onClick={() => router.push("/merchant")}
          className="mb-8 text-sm text-[#541D2E] hover:underline"
        >
          ← Back to Dashboard
        </button>

        {business ? (
          <>
            <p className="text-sm font-medium tracking-widest text-[#B68A45]">
              MERCHANT PORTAL
            </p>

            <h1
              className="mt-2 text-4xl font-semibold text-[#541D2E]"
              style={{ fontFamily: '"Cormorant Garamond", serif' }}
            >
              Business Profile
            </h1>

            <div className="mt-8 rounded-2xl border border-[#E9DED5] bg-white p-6 shadow-sm md:p-9">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E9DED5] pb-6">
                <div>
                  <h2 className="text-2xl font-semibold text-[#541D2E]">
                    {business.business_name}
                  </h2>
                  <p className="mt-1 text-sm text-[#8A7778]">
                    {business.business_type}
                  </p>
                </div>

                <span
                  className={`rounded-full px-4 py-2 text-sm font-semibold ${
                    business.verification_status === "Verified"
                      ? "bg-green-100 text-green-700"
                      : business.verification_status === "Rejected"
                        ? "bg-red-100 text-red-700"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {business.verification_status}
                </span>
              </div>

              {business.verification_status === "Pending" && (
                <div className="mt-6 rounded-xl bg-[#F5EBDD] p-4 text-sm leading-6 text-[#6F563C]">
                  Your business registration has been submitted and is
                  waiting for verification by the relevant authority.
                </div>
              )}

              {business.verification_status === "Verified" && (
                <div className="mt-6 rounded-xl bg-green-50 p-4 text-sm leading-6 text-green-700">
                  Your business has been verified successfully.
                </div>
              )}

              {business.verification_status === "Rejected" && (
                <div className="mt-6 rounded-xl bg-red-50 p-4 text-sm leading-6 text-red-700">
                  <p className="font-semibold">Registration Rejected</p>
                  <p className="mt-1">
                    {business.rejection_reason ||
                      "No rejection reason has been provided."}
                  </p>
                </div>
              )}

              <h3 className="mt-8 text-lg font-semibold text-[#541D2E]">
                Business Information
              </h3>

              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <ProfileField label="Business Name" value={business.business_name} />
                <ProfileField label="Business Type" value={business.business_type} />
                <ProfileField label="NIB" value={business.nib} />
                <ProfileField label="Alcohol License Number" value={business.license_number} />
              </div>

              <h3 className="mt-8 border-t border-[#E9DED5] pt-7 text-lg font-semibold text-[#541D2E]">
                Business Location
              </h3>

              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <ProfileField label="Address" value={business.address} />
                <ProfileField label="Province" value={business.province} />
                <ProfileField label="City / Regency" value={business.city} />
                <ProfileField label="Postal Code" value={business.postal_code} />
                <ProfileField
                  label="Latitude"
                  value={business.latitude?.toString()}
                />
                <ProfileField
                  label="Longitude"
                  value={business.longitude?.toString()}
                />
              </div>

              <h3 className="mt-8 border-t border-[#E9DED5] pt-7 text-lg font-semibold text-[#541D2E]">
                Contact Information
              </h3>

              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <ProfileField label="Business Phone" value={business.phone} />
                <ProfileField label="Business Email" value={business.business_email} />
              </div>

              <p className="mt-8 text-xs text-[#8A7778]">
                Submitted on{" "}
                {new Date(business.created_at).toLocaleDateString("en-GB")}
              </p>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-medium tracking-widest text-[#B68A45]">
              MERCHANT PORTAL
            </p>

            <h1
              className="mt-2 text-4xl font-semibold text-[#541D2E]"
              style={{ fontFamily: '"Cormorant Garamond", serif' }}
            >
              Business Registration
            </h1>

            <p className="mt-3 text-sm leading-6 text-[#8A7778]">
              Register your business information with VerAge to begin the
              licensing verification process.
            </p>

            <form
              onSubmit={handleSubmit}
              className="mt-8 rounded-2xl border border-[#E9DED5] bg-white p-6 shadow-sm md:p-9"
            >
              <h2 className="text-xl font-semibold text-[#541D2E]">
                Business Information
              </h2>

              <div className="mt-6 grid gap-5">
                <FormField label="Business Name *">
                  <input name="business_name" required className={inputClass} placeholder="Enter your business name" />
                </FormField>

                <FormField label="Business Type *">
                  <select name="business_type" required defaultValue="" className={inputClass}>
                    <option value="" disabled>Select business type</option>
                    <option>Retail Store</option>
                    <option>Restaurant</option>
                    <option>Bar</option>
                    <option>Hotel</option>
                    <option>Distributor</option>
                    <option>Other</option>
                  </select>
                </FormField>

                <div className="grid gap-5 md:grid-cols-2">
                  <FormField label="NIB *">
                    <input name="nib" required className={inputClass} placeholder="Business Identification Number" />
                  </FormField>

                  <FormField label="Alcohol License Number *">
                    <input name="license_number" required className={inputClass} placeholder="Enter license number" />
                  </FormField>
                </div>
              </div>

              <h2 className="mt-10 border-t border-[#E9DED5] pt-8 text-xl font-semibold text-[#541D2E]">
                Business Location
              </h2>

              <div className="mt-6 grid gap-5">
                <FormField label="Full Address *">
                  <textarea name="address" required rows={3} className={inputClass} placeholder="Street, building, neighborhood, etc." />
                </FormField>

                <div className="grid gap-5 md:grid-cols-2">
                  <FormField label="Province *">
                    <select name="province" required defaultValue="West Java" className={inputClass}>
                      <option value="West Java">West Java</option>
                      <option value="DKI Jakarta">DKI Jakarta</option>
                      <option value="Banten">Banten</option>
                      <option value="Other">Other Province</option>
                    </select>
                  </FormField>

                  <FormField label="City / Regency *">
                    <input name="city" required className={inputClass} placeholder="e.g. Bandung" />
                  </FormField>
                </div>

                <FormField label="Postal Code *">
                  <input name="postal_code" required className={inputClass} placeholder="Postal code" />
                </FormField>
              </div>

              <h3 className="mt-8 border-t border-[#E9DED5] pt-7 text-base font-semibold text-[#541D2E]">
                Outlet Coordinates
              </h3>

              <p className="mt-1 text-sm text-[#8A7778]">
                Coordinates are optional. Fill in both fields if you want
                your outlet to appear on the monitoring map.
              </p>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <FormField label="Latitude">
                  <input name="latitude" type="number" step="any" min="-90" max="90" className={inputClass} placeholder="-6.9175" />
                </FormField>

                <FormField label="Longitude">
                  <input name="longitude" type="number" step="any" min="-180" max="180" className={inputClass} placeholder="107.6191" />
                </FormField>
              </div>

              <h2 className="mt-10 border-t border-[#E9DED5] pt-8 text-xl font-semibold text-[#541D2E]">
                Contact Information
              </h2>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <FormField label="Business Phone *">
                  <input name="phone" type="tel" required className={inputClass} placeholder="+62..." />
                </FormField>

                <FormField label="Business Email *">
                  <input name="business_email" type="email" required className={inputClass} placeholder="business@email.com" />
                </FormField>
              </div>

              <div className="mt-8 rounded-xl bg-[#F5EBDD] p-4 text-sm leading-6 text-[#6F563C]">
                Your registration will be submitted for government
                verification. Your business status will remain Pending
                until the relevant authority reviews your information.
              </div>

              {error && (
                <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-8 w-full rounded-xl bg-[#541D2E] px-5 py-4 font-medium text-white transition hover:bg-[#713247] disabled:opacity-60"
              >
                {loading ? "Submitting Registration..." : "Submit Business Registration"}
              </button>
            </form>
          </>
        )}

        {error && business && (
          <p className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-[#8A7778]">
          VerAge Integrated Alcohol Control System
        </p>
      </div>
    </main>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[#38272B]">
        {label}
      </label>
      {children}
    </div>
  );
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[#8A7778]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm text-[#38272B]">
        {value || "-"}
      </p>
    </div>
  );
}
