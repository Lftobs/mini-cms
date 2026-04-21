import React, { useState, useEffect } from "react";
import api from "@/lib/clients";
import Collaborators from "./Collaborators";

interface DirectoryConfig {
  path: string;
  schema?: Record<string, any>;
  naming_convention?: string;
  base_image_path?: string;
}

interface ProjectSettingsModalProps {
  projectId: string;
}

export default function ProjectSettingsModal({
  projectId,
}: ProjectSettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [allowedDirs, setAllowedDirs] = useState<DirectoryConfig[]>([]);
  const [rawAllowedText, setRawAllowedText] = useState("");
  const [isAdvanced, setIsAdvanced] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"general" | "collaborators">(
    "general",
  );
  const [baseImagePath, setBaseImagePath] = useState<string>("");

  const fetchSettings = async () => {
    try {
      const res = await (api.projects as any)[projectId].settings.$get();
      if (res.ok) {
        const data = await res.json();
        setSettings(data.data);
        const dirs = data.data.public_directories || [];
        setAllowedDirs(dirs);

        const simpleList = dirs
          .map((d: any) => (typeof d === "string" ? d : d.path))
          .join("\n");
        setRawAllowedText(simpleList);

        const firstWithImagePath = dirs.find((d: any) => d.base_image_path);
        if (firstWithImagePath?.base_image_path) {
          setBaseImagePath(firstWithImagePath.base_image_path);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        console.error(
          "Failed to fetch settings:",
          errData.message || res.statusText,
        );
      }
    } catch (e) {
      console.error("Failed to fetch settings", e);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setLoading(true);
    fetchSettings().finally(() => setLoading(false));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      let finalDirs: DirectoryConfig[] = [];

      if (isAdvanced) {
        try {
          finalDirs = JSON.parse(rawAllowedText);
          if (!Array.isArray(finalDirs)) throw new Error("Must be an array");
        } catch (e) {
          alert(
            "Invalid JSON in advanced configuration. Please check your syntax.",
          );
          setSaving(false);
          return;
        }
      } else {
        // Simple view: parse paths and add base_image_path to each directory config
        const paths = rawAllowedText
          .split("\n")
          .map((d) => d.trim())
          .filter((d) => d);

        finalDirs = paths.map((path) => ({
          path,
          base_image_path: baseImagePath || undefined,
        }));
      }

      // Exclude DB timestamps from payload to avoid serialization issues
      const { created_at, updated_at, ...settingsWithoutTimestamps } =
        settings || {};
      const payload = settings
        ? {
            ...settingsWithoutTimestamps,
            public_directories: finalDirs,
          }
        : {
            public_directories: finalDirs,
          };

      const res = await (api.projects as any)[projectId].settings.$put({
        json: payload,
      });

      if (res.ok) {
        setIsOpen(false);
        window.dispatchEvent(new Event("project-settings-updated"));
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(
          `Failed to save settings: ${errData.message || res.statusText || "Unknown error"}`,
        );
      }
    } catch (e) {
      console.error("Failed to save settings", e);
      alert("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="inline-flex items-center px-3 py-2 text-sm font-medium text-earth-400 bg-earth-50 border border-earth-200 rounded-lg hover:bg-earth-100 hover:text-earth-500 transition-colors"
      >
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
        Settings
      </button>

      {isOpen && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[650px] max-h-[90vh] overflow-hidden shadow-xl border border-earth-100 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-earth-500">
                Project Settings
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-earth-300 hover:text-earth-500"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-earth-100 mb-6">
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "general"
                    ? "border-earth-500 text-earth-500"
                    : "border-transparent text-earth-300 hover:text-earth-400"
                }`}
                onClick={() => setActiveTab("general")}
              >
                General
              </button>
              <button
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === "collaborators"
                    ? "border-earth-500 text-earth-500"
                    : "border-transparent text-earth-300 hover:text-earth-400"
                }`}
                onClick={() => setActiveTab("collaborators")}
              >
                Collaborators
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              {activeTab === "general" && (
                <div className="space-y-6">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-earth-400"></div>
                      <div className="text-earth-300">
                        Loading general settings...
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="block text-sm font-medium text-earth-400">
                            Allowed Directories
                          </label>
                          <button
                            onClick={() => {
                              if (!isAdvanced) {
                                // Switch to advanced: show full JSON
                                const dirsWithImagePath = allowedDirs.map(
                                  (d: any) => {
                                    const config: DirectoryConfig = {
                                      path: typeof d === "string" ? d : d.path,
                                    };
                                    if (baseImagePath)
                                      config.base_image_path = baseImagePath;
                                    if (d.schema) config.schema = d.schema;
                                    if (d.naming_convention)
                                      config.naming_convention =
                                        d.naming_convention;
                                    return config;
                                  },
                                );
                                setRawAllowedText(
                                  JSON.stringify(dirsWithImagePath, null, 2),
                                );
                              } else {
                                // Switch to simple: path list
                                const simpleList = allowedDirs
                                  .map((d: any) =>
                                    typeof d === "string" ? d : d.path,
                                  )
                                  .join("\n");
                                setRawAllowedText(simpleList);
                              }
                              setIsAdvanced(!isAdvanced);
                            }}
                            className="text-xs font-semibold text-earth-300 hover:text-earth-500 bg-earth-50 px-2 py-1 rounded border border-earth-100 transition-colors"
                          >
                            {isAdvanced
                              ? "Switch to Simple View"
                              : "Advanced Configuration (JSON)"}
                          </button>
                        </div>
                        <p className="text-xs text-earth-300 mb-4">
                          {isAdvanced
                            ? "Edit the full configuration object including naming conventions, schemas, and base image paths for each directory."
                            : "Enter one directory path per line (e.g., content/blog)."}
                        </p>
                        <textarea
                          value={rawAllowedText}
                          onChange={(e) => setRawAllowedText(e.target.value)}
                          className="w-full h-48 px-3 py-2 border border-earth-200 rounded-md focus:outline-none focus:ring-2 focus:ring-earth-400 focus:border-transparent text-sm font-mono placeholder:text-earth-100"
                          placeholder={
                            isAdvanced
                              ? '[{\n  "path": "content/blog",\n  "naming_convention": "kebab-case",\n  "schema": { "title": { "type": "string" } },\n  "base_image_path": "public/images"\n}]'
                              : "content/posts\npublic/images"
                          }
                        />
                        {!isAdvanced && (
                          <p className="mt-2 text-xs text-earth-300 italic">
                            Tip: Switch to Advanced view to set up custom file
                            schemas, naming rules, and image paths.
                          </p>
                        )}
                      </div>

                      {/* Base Image Path - only show in simple mode */}
                      {!isAdvanced && (
                        <div>
                          <label className="block text-sm font-medium text-earth-400 mb-2">
                            Base Image Path
                          </label>
                          <p className="text-xs text-earth-300 mb-2">
                            Default path where images are stored. This will be
                            applied to all directories.
                          </p>
                          <input
                            type="text"
                            value={baseImagePath}
                            onChange={(e) => setBaseImagePath(e.target.value)}
                            placeholder="e.g., public/images or /assets/img"
                            className="w-full px-3 py-2 border border-earth-200 rounded-md focus:outline-none focus:ring-2 focus:ring-earth-400 focus:border-transparent text-sm"
                          />
                          <p className="mt-1 text-xs text-earth-300">
                            This path will be used as the base for image
                            references in your content.
                          </p>
                        </div>
                      )}

                      <div className="flex justify-end space-x-3 pt-6 border-t border-earth-100 mb-4">
                        <button
                          onClick={() => setIsOpen(false)}
                          className="px-4 py-2 text-sm text-earth-400 border border-earth-200 rounded-md hover:bg-earth-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-4 py-2 text-sm bg-earth-400 text-white rounded-md hover:bg-earth-500 disabled:bg-earth-200 disabled:text-earth-300 transition-colors flex items-center"
                        >
                          {saving && (
                            <svg
                              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                              xmlns="http://www.w3.org/2000/svg"
                              fill="none"
                              viewBox="0 0 24 24"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              ></path>
                            </svg>
                          )}
                          Save Changes
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {activeTab === "collaborators" && (
                <div className="anim-fade-in py-2">
                  <Collaborators projectId={projectId} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
