
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import { createClient } from "../../../lib/supabase/client";

type Outlet = {
  id: string;
  business_name: string;
  business_type: string;
  city: string;
  address: string;
  province: string;
  verification_status: "Verified" | "Pending" | "Rejected";
  latitude: number | null;
  longitude: number | null;
};

const statusColors: Record<Outlet["verification_status"], string> = {
  Verified: "#16a34a",
  Pending: "#eab308",
  Rejected: "#dc2626",
};

export default function WestJavaMap() {
  const supabase = createClient();

  const [mapReady, setMapReady] = useState(false);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setMapReady(true);
  }, []);

  useEffect(() => {
    async function loadOutlets() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("businesses")
        .select(
          "id, business_name, business_type, city, address, province, verification_status, latitude, longitude"
        )
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
        setOutlets([]);
        setLoading(false);
        return;
      }

      setOutlets((data || []) as Outlet[]);
      setLoading(false);
    }

    loadOutlets();
  }, []);

  const filteredOutlets = useMemo(() => {
    return outlets.filter((outlet) => {
      const keyword = search.toLowerCase();

      const matchesSearch =
        outlet.business_name.toLowerCase().includes(keyword) ||
        outlet.city.toLowerCase().includes(keyword) ||
        outlet.address.toLowerCase().includes(keyword);

      const matchesStatus =
        selectedStatus === "All" ||
        outlet.verification_status === selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }, [outlets, search, selectedStatus]);

  const outletsWithCoordinates = filteredOutlets.filter(
    (outlet) =>
      outlet.latitude !== null &&
      outlet.longitude !== null
  );

  const center: LatLngExpression = [-6.9, 107.5];

  return (
    <section className="mt-8 overflow-hidden rounded-2xl border border-[#e9dfd5] bg-white shadow-sm">
      <div className="p-6 md:p-7">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[#a17b70]">
              Geographic Monitoring
            </p>

            <h2 className="mt-1 font-serif text-2xl font-semibold text-[#641c2b]">
              West Java Outlet Map
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Monitor registered outlet locations and their verification status.
            </p>
          </div>

          <div className="rounded-xl bg-[#f8f4ed] px-4 py-3">
            <p className="text-xs text-gray-500">Displayed outlets</p>
            <p className="text-2xl font-semibold text-[#641c2b]">
              {filteredOutlets.length}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search outlet, city, or address..."
            className="w-full rounded-lg border border-[#e9dfd5] px-4 py-3 text-sm outline-none focus:border-[#641c2b]"
          />

          <select
            value={selectedStatus}
            onChange={(event) => setSelectedStatus(event.target.value)}
            className="w-full rounded-lg border border-[#e9dfd5] bg-white px-4 py-3 text-sm outline-none focus:border-[#641c2b]"
          >
            <option value="All">All Statuses</option>
            <option value="Verified">Verified</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        <div className="mt-5 flex flex-wrap gap-4">
          {Object.entries(statusColors).map(([status, color]) => (
            <div key={status} className="flex items-center gap-2">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-600">{status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-0 h-[420px] w-full overflow-hidden rounded-xl">
        {mapReady ? (
          <MapContainer
            center={center}
            zoom={8}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {outletsWithCoordinates.map((outlet) => (
              <CircleMarker
                key={outlet.id}
                center={[
                  outlet.latitude as number,
                  outlet.longitude as number,
                ]}
                radius={9}
                pathOptions={{
                  color: "#ffffff",
                  weight: 2,
                  fillColor: statusColors[outlet.verification_status],
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <div className="min-w-[180px]">
                    <strong>{outlet.business_name}</strong>

                    <p className="mt-1 text-sm">
                      {outlet.business_type}
                    </p>

                    <p className="mt-1 text-sm">
                      {outlet.address}, {outlet.city}
                    </p>

                    <p className="mt-2 text-sm">
                      Status:{" "}
                      <strong>{outlet.verification_status}</strong>
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Loading map...
          </div>
        )}
      </div>

      <div className="p-6">
        <h3 className="font-semibold text-[#641c2b]">
          Outlet Locations
        </h3>

        {loading ? (
          <p className="mt-4 text-sm text-gray-500">
            Loading outlet data...
          </p>
        ) : error ? (
          <p className="mt-4 text-sm text-red-600">
            Failed to load outlets: {error}
          </p>
        ) : filteredOutlets.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            No outlets found.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {filteredOutlets.map((outlet) => (
              <div
                key={outlet.id}
                className="rounded-xl border border-[#e9dfd5] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#38252a]">
                      {outlet.business_name}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {outlet.business_type}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {outlet.city}, {outlet.province}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      {outlet.address}
                    </p>

                    {outlet.latitude === null ||
                    outlet.longitude === null ? (
                      <p className="mt-2 text-xs text-amber-600">
                        Location coordinates not available
                      </p>
                    ) : null}
                  </div>

                  <span
                    className="shrink-0 rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      color: statusColors[outlet.verification_status],
                      backgroundColor: `${statusColors[outlet.verification_status]}18`,
                    }}
                  >
                    {outlet.verification_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-5 text-xs text-gray-400">
          Outlet information is retrieved from the VerAge database.
          Only outlets with coordinates appear on the map.
        </p>
      </div>
    </section>
  );
}
