
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setError(profileError?.message || "User profile not found.");
      setLoading(false);
      return;
    }

    if (profile.role === "government") {
      router.replace("/government");
    } else if (profile.role === "merchant") {
      router.replace("/merchant");
    } else {
      await supabase.auth.signOut();
      setError("Invalid user role.");
      setLoading(false);
      return;
    }

    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#f8f4ed] px-6 py-12">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="font-times new roman text-4xl font-semibold text-[#641c2b]">
            VerAge
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Integrated Alcohol Control System
          </p>

          <h2 className="mt-8 text-2xl font-semibold text-[#641c2b]">
            Welcome Back
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Sign in to your VerAge account.
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email Address
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#641c2b]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-[#641c2b]"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-[#641c2b] py-3 font-medium text-white transition hover:bg-[#4d1420] disabled:opacity-60"
          >
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <a
            href="/signup"
            className="font-semibold text-[#641c2b] hover:underline"
          >
            Create Account
          </a>
        </p>
      </div>
    </main>
  );
}
