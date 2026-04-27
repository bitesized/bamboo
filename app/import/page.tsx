"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { parseStoryGraphRow } from "@/lib/storygraph";
import type { StoryGraphRow } from "@/lib/storygraph";
import type { ImportBookResult } from "@/app/api/import/book/route";

type Phase = "idle" | "ready" | "importing" | "done";

interface Report {
  imported: string[];
  already_in_library: string[];
  not_found: string[];
}

export default function ImportPage() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [rows, setRows] = useState<StoryGraphRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<Report>({ imported: [], already_in_library: [], not_found: [] });
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const parsed = data
          .map(parseStoryGraphRow)
          .filter((r): r is StoryGraphRow => r !== null);
        setRows(parsed);
        setPhase("ready");
      },
    });
  }

  async function runImport() {
    setPhase("importing");
    setProgress(0);

    const result: Report = { imported: [], already_in_library: [], not_found: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const res = await fetch("/api/import/book", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(row),
        });
        const data: ImportBookResult = await res.json();
        result[data.result].push(data.title);
      } catch {
        result.not_found.push(row.title);
      }
      setProgress(i + 1);
    }

    setReport(result);
    setPhase("done");
  }

  function reset() {
    setPhase("idle");
    setRows([]);
    setProgress(0);
    setReport({ imported: [], already_in_library: [], not_found: [] });
    if (fileRef.current) fileRef.current.value = "";
  }

  const pct = rows.length > 0 ? Math.round((progress / rows.length) * 100) : 0;

  return (
    <div className="max-w-xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import from StoryGraph</h1>
        <p className="text-stone-500 text-sm mt-1">
          Upload a StoryGraph CSV export to populate your library.
        </p>
      </div>

      {/* ── Onboarding warning ── */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-1">
        <p className="font-medium">Intended for onboarding</p>
        <p>
          This import is designed to be run once when setting up Bamboo. Running it after
          you've already added books may create duplicate entries on your shelves.
          No existing data will be overwritten or deleted.
        </p>
      </div>

      {phase === "idle" && (
        <div className="space-y-4">
          <p className="text-sm text-stone-600">
            Export your data from StoryGraph:{" "}
            <span className="font-mono text-xs bg-stone-100 px-1.5 py-0.5 rounded">
              Settings → Import / Export → Export your library
            </span>
          </p>
          <label className="block">
            <span className="text-sm font-medium text-stone-700">Select CSV file</span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="mt-1 block w-full text-sm text-stone-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-stone-900 file:text-white hover:file:bg-stone-700 cursor-pointer"
            />
          </label>
        </div>
      )}

      {phase === "ready" && (
        <div className="space-y-4">
          <p className="text-sm text-stone-700">
            <span className="font-semibold">{rows.length} books</span> found in the CSV and ready to import.
          </p>
          <div className="flex gap-3">
            <button
              onClick={runImport}
              className="px-4 py-2 bg-stone-900 text-white text-sm rounded-lg hover:bg-stone-700 transition-colors"
            >
              Start import
            </button>
            <button
              onClick={reset}
              className="px-4 py-2 text-stone-600 text-sm rounded-lg border border-stone-200 hover:border-stone-400 transition-colors"
            >
              Choose different file
            </button>
          </div>
        </div>
      )}

      {phase === "importing" && (
        <div className="space-y-3">
          <p className="text-sm text-stone-600">
            Importing {progress} of {rows.length}…
          </p>
          <div className="w-full bg-stone-100 rounded-full h-2">
            <div
              className="bg-stone-800 h-2 rounded-full transition-all duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-stone-400">
            Each book is looked up on Google Books. This may take a few minutes.
          </p>
        </div>
      )}

      {phase === "done" && (
        <div className="space-y-6">
          {/* ── Summary ── */}
          <div className="grid grid-cols-3 gap-4">
            <SummaryCard
              value={report.imported.length}
              label="Imported"
              colour="text-green-700 bg-green-50 border-green-200"
            />
            <SummaryCard
              value={report.already_in_library.length}
              label="Already in library"
              colour="text-stone-600 bg-stone-50 border-stone-200"
            />
            <SummaryCard
              value={report.not_found.length}
              label="Not found"
              colour="text-amber-700 bg-amber-50 border-amber-200"
            />
          </div>

          {/* ── Not found list ── */}
          {report.not_found.length > 0 && (
            <section>
              <h2 className="font-medium text-sm mb-2">
                Not found on Google Books ({report.not_found.length})
              </h2>
              <ul className="text-sm text-stone-600 space-y-1 max-h-60 overflow-y-auto border border-stone-200 rounded-lg p-3 bg-white">
                {report.not_found.map((title) => (
                  <li key={title} className="truncate">
                    {title}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-stone-400 mt-1">
                These can be added manually via Search.
              </p>
            </section>
          )}

          {/* ── Already in library list ── */}
          {report.already_in_library.length > 0 && (
            <section>
              <h2 className="font-medium text-sm mb-2">
                Already in library ({report.already_in_library.length})
              </h2>
              <ul className="text-sm text-stone-500 space-y-1 max-h-40 overflow-y-auto border border-stone-200 rounded-lg p-3 bg-white">
                {report.already_in_library.map((title) => (
                  <li key={title} className="truncate">
                    {title}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <button
            onClick={reset}
            className="text-sm text-stone-500 hover:text-stone-900 transition-colors"
          >
            ← Import another file
          </button>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  value,
  label,
  colour,
}: {
  value: number;
  label: string;
  colour: string;
}) {
  return (
    <div className={`border rounded-lg p-4 ${colour}`}>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs mt-0.5">{label}</p>
    </div>
  );
}
