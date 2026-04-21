import type React from "react";
import { useCallback, useEffect, useState, useRef } from "react";
import { actions } from "astro:actions";
import api from "@/lib/clients";
import CommitPanel from "./CommitPanel.tsx";
import FileExplorer from "./FileExplorer.tsx";
import MediaManager from "./MediaManager.tsx";

interface MDXEditorProps {
  projectId: string;
  repoOwner: string;
  repoName: string;
}

interface FileItem {
  name: string;
  path: string;
  type: "file" | "dir";
  size: number;
  sha: string;
}

interface DraftData {
  content: string;
  timestamp: number;
  filePath: string;
}

const MDXEditorToast: React.FC<MDXEditorProps> = ({
  projectId,
  repoOwner,
  repoName,
}) => {
  const computeHash = async (content: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(content);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  };

  const getSize = (content: string): number => {
    return new TextEncoder().encode(content).length;
  };

  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [originalHash, setOriginalHash] = useState<string>("");
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isCommitPanelOpen, setIsCommitPanelOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, DraftData>>({});
  const [mdxError, setMdxError] = useState<string | null>(null);
  const [repoConfig, setRepoConfig] = useState<any[]>([]);
  const [schemaErrors, setSchemaErrors] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [EditorComponent, setEditorComponent] = useState<any>(null);
  const [editorRef, setEditorRef] = useState<any>(null);
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showDraftModal, setShowDraftModal] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<{
    content: string;
    timestamp: number;
    filePath: string;
  } | null>(null);
  const [pendingCreates, setPendingCreates] = useState<
    Array<{ path: string; type: "file" | "folder" }>
  >([]);
  const [mediaPath, setMediaPath] = useState<string>("");
  const [showMediaPanel, setShowMediaPanel] = useState(false);

  // Fetch media base path from config
  useEffect(() => {
    const fetchMediaPath = async () => {
      try {
        const response = await (api.projects as any)[projectId].repo[repoOwner][
          repoName
        ].config.$get();
        if (response.ok) {
          const data = await response.json();
          const config = data.data;
          const firstWithImagePath = config.find((c: any) => c.base_image_path);
          if (firstWithImagePath?.base_image_path) {
            setMediaPath(firstWithImagePath.base_image_path);
          }
        }
      } catch (err) {
        console.error("Failed to fetch media path:", err);
      }
    };
    fetchMediaPath();
  }, [projectId, repoOwner, repoName]);

  const insertImageMarkdown = useCallback(
    (imageUrl: string) => {
      if (!editorRef) return;

      const imageMarkdown = `\n![Image](${imageUrl})\n`;
      const currentContent = fileContent;
      const newContent = currentContent + imageMarkdown;
      setFileContent(newContent);
      setHasUnsavedChanges(true);
    },
    [editorRef, fileContent],
  );

  useEffect(() => {
    const savedDrafts = localStorage.getItem(`mdx-drafts-${projectId}`);
    if (savedDrafts) {
      try {
        setDrafts(JSON.parse(savedDrafts));
      } catch (e) {
        console.error("Failed to load drafts:", e);
      }
    }
  }, [projectId]);

  useEffect(() => {
    if (Object.keys(drafts).length > 0) {
      localStorage.setItem(`mdx-drafts-${projectId}`, JSON.stringify(drafts));
    }
  }, [drafts, projectId]);

  // Fetch repo config for validation
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const response = await (api.projects as any)[projectId].repo[repoOwner][
          repoName
        ].config.$get();
        if (response.ok) {
          const data = await response.json();
          setRepoConfig(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch repo config:", err);
      }
    };
    fetchConfig();
  }, [projectId, repoOwner, repoName]);

  const validateContent = useCallback(
    async (content: string, path: string) => {
      const config = repoConfig.find(
        (c) => path.startsWith(c.path + "/") || path === c.path,
      );
      if (!config?.schema) {
        setSchemaErrors([]);
        return;
      }

      const errors: string[] = [];
      const match = content.match(/^---\n([\s\S]*?)\n---/);

      if (!match) {
        errors.push(
          "Missing frontmatter (---) correctly positioned at the start.",
        );
        setSchemaErrors(errors);
        return;
      }

      try {
        const YAML = (await import("yaml")).default;
        const frontmatter = YAML.parse(match[1]);

        Object.entries(config.schema).forEach(
          ([key, schema]: [string, any]) => {
            const value = frontmatter[key];

            // Only validate required fields (required defaults to true if not specified)
            if (
              schema.required !== false &&
              (value === undefined || value === null || value === "")
            ) {
              errors.push(`Field "${key}" is required.`);
              return;
            }

            // Skip further validation if field is empty and not required
            if (
              schema.required === false &&
              (value === undefined || value === null || value === "")
            ) {
              return;
            }

            if (schema.type === "string") {
              const strValue = String(value);
              if (schema.min && strValue.length < schema.min) {
                errors.push(
                  `"${key}" must be at least ${schema.min} characters.`,
                );
              }
              if (schema.max && strValue.length > schema.max) {
                errors.push(
                  `"${key}" must be at most ${schema.max} characters.`,
                );
              }
            } else if (schema.type === "date") {
              const date = new Date(value);
              if (isNaN(date.getTime())) {
                errors.push(`"${key}" must be a valid date.`);
              }
              if (schema.format) {
                // Simple format check (e.g. YYYY-MM-DD vs YYYY/MM/DD)
                if (
                  schema.format === "YYYY-MM-DD" &&
                  !/^\d{4}-\d{2}-\d{2}$/.test(value)
                ) {
                  errors.push(`"${key}" must be in YYYY-MM-DD format.`);
                }
              }
            }
          },
        );
      } catch (e) {
        errors.push("Invalid YAML in frontmatter.");
      }

      setSchemaErrors(errors);
    },
    [repoConfig],
  );

  // Mount tracking and dynamic editor loading
  useEffect(() => {
    setIsMounted(true);

    const loadEditor = async () => {
      try {
        const [editorModule] = await Promise.all([
          import("@toast-ui/react-editor"),
          import("@toast-ui/editor/dist/toastui-editor.css"),
        ]);
        setEditorComponent(() => editorModule.Editor);
      } catch (err) {
        console.error("Failed to load editor modules:", err);
        setError("Failed to load editor component");
      }
    };

    loadEditor();
  }, [projectId, repoOwner, repoName]);

  useEffect(() => {
    if (selectedFile) {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }

      validationTimeoutRef.current = setTimeout(() => {
        validateContent(fileContent, selectedFile.path);
      }, 500); // 500ms debounce
    }

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [fileContent, selectedFile, validateContent]);

  const loadFileContent = useCallback(
    async (file: FileItem) => {
      if (file.type === "dir") return;

      const isPending = pendingCreates.some(
        (p) => p.path === file.path && p.type === "file",
      );

      if (isPending) {
        // for pending files, content is in drafts or empty
        const draftKey = `${repoOwner}/${repoName}/${file.path}`;
        const content = drafts[draftKey]?.content || "# New File Content";
        setFileContent(content);
        // for new files, original is empty
        setOriginalHash(await computeHash(""));
        setOriginalSize(0);
        setSelectedFile(file);
        setHasUnsavedChanges(!!content);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await (api.projects as any)[projectId].repo[repoOwner][
          repoName
        ].file.$get({
          query: {
            path: file.path,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load file: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.data.content || "";

        setFileContent(content);

        // compute hash and size for original content
        const hash = await computeHash(content);
        const size = getSize(content);
        setOriginalHash(hash);
        setOriginalSize(size);

        setSelectedFile(file);
        setHasUnsavedChanges(false);

        // check if there's a draft for this file
        const draftKey = `${repoOwner}/${repoName}/${file.path}`;
        if (drafts[draftKey]) {
          const draft = drafts[draftKey];
          if (draft.content !== content) {
            setPendingDraft(draft);
            setShowDraftModal(true);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load file");
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, repoOwner, repoName, drafts, pendingCreates],
  );

  const handleContentChange = useCallback((content: string) => {
    setFileContent(content);
  }, []);

  // async change detection using hash and size
  useEffect(() => {
    const checkChanges = async () => {
      if (!selectedFile) return;

      // metadata check (size)
      const currentSize = getSize(fileContent);
      if (currentSize !== originalSize) {
        setHasUnsavedChanges(true);
        return;
      }

      // cryptographic hash check
      const currentHash = await computeHash(fileContent);
      setHasUnsavedChanges(currentHash !== originalHash);
    };

    checkChanges();
  }, [fileContent, originalSize, originalHash, selectedFile]);

  // auto-save draft
  useEffect(() => {
    if (hasUnsavedChanges && selectedFile) {
      const timeoutId = setTimeout(() => {
        saveDraft();
      }, 2000); // auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId);
    }
  }, [fileContent, hasUnsavedChanges, selectedFile]);

  // Save draft manually
  const saveDraft = useCallback(() => {
    if (!selectedFile) return;

    const draftKey = `${repoOwner}/${repoName}/${selectedFile.path}`;
    const newDrafts = {
      ...drafts,
      [draftKey]: {
        content: fileContent,
        timestamp: Date.now(),
        filePath: selectedFile.path,
      },
    };
    setDrafts(newDrafts);
  }, [drafts, fileContent, repoOwner, repoName, selectedFile]);

  const handleFileCreate = useCallback(
    (path: string, type: "file" | "folder") => {
      setPendingCreates((prev) => [...prev, { path, type }]);

      if (type === "file") {
        const newFile: FileItem = {
          name: path.split("/").pop() || "",
          path,
          type: "file",
          size: 0,
          sha: "",
        };

        const draftKey = `${repoOwner}/${repoName}/${path}`;
        setDrafts((prev) => ({
          ...prev,
          [draftKey]: {
            content: "# New File Content",
            timestamp: Date.now(),
            filePath: path,
          },
        }));
        setSelectedFile(newFile);
        setFileContent("# New File Content");

        computeHash("").then((hash) => {
          setOriginalHash(hash);
          setOriginalSize(0);
        });
        setHasUnsavedChanges(true); // treat new file as having changes so it can be committed
      }
    },
    [repoOwner, repoName],
  );

  const handleCommit = useCallback(
    async (
      commitMessage: string,
      filesToCommit: {
        path: string;
        content: string;
      }[],
    ) => {
      try {
        if (schemaErrors.length > 0) {
          alert("Please fix schema errors before committing.");
          return;
        }

        const allFilesToCommit = [...filesToCommit];

        pendingCreates.forEach((item) => {
          if (item.type === "file") {
            // ensure pending files are included even if empty/unchanged
            // (though usually they'd be in filesToCommit via getUnsavedFiles)
            const exists = allFilesToCommit.some((f) => f.path === item.path);
            if (!exists) {
              const draftKey = `${repoOwner}/${repoName}/${item.path}`;
              const content = drafts[draftKey]?.content || "";
              allFilesToCommit.push({
                path: item.path,
                content,
              });
            }
          }
        });

        if (allFilesToCommit.length === 0) {
          alert("No changes to commit.");
          return;
        }

        const response = await (api.projects as any)[projectId].repo[repoOwner][
          repoName
        ]["bulk-update"].$post({
          json: {
            files: allFilesToCommit,
            message: commitMessage,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to commit changes: ${response.statusText}`);
        }

        allFilesToCommit.forEach(async (file) => {
          try {
            await actions.projectsActions.logActivity({
              projectId,
              actionType: "commit",
              filePath: file.path,
              fileName: file.path.split("/").pop() || "",
              fileSize: getSize(file.content),
              changesSummary: commitMessage,
            });
          } catch (error) {
            console.error("Failed to log activity:", error);
          }
        });

        const newDrafts = { ...drafts };
        allFilesToCommit.forEach((file) => {
          const draftKey = `${repoOwner}/${repoName}/${file.path}`;
          delete newDrafts[draftKey];
        });
        setDrafts(newDrafts);
        setPendingCreates([]);

        if (
          selectedFile &&
          allFilesToCommit.some((f) => f.path === selectedFile.path)
        ) {
          // update original hash/size to match committed content
          const newHash = await computeHash(fileContent);
          const newSize = getSize(fileContent);
          setOriginalHash(newHash);
          setOriginalSize(newSize);
          setHasUnsavedChanges(false);
        }

        setIsCommitPanelOpen(false);
        alert("Changes committed successfully!");

        // trigger reload in FileExplorer (via window event as implemented before) - could be improved
        window.dispatchEvent(new Event("project-settings-updated"));
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to commit changes");
      }
    },
    [
      projectId,
      repoOwner,
      repoName,
      drafts,
      selectedFile,
      fileContent,
      pendingCreates,
      schemaErrors,
    ],
  );

  const getUnsavedFiles = useCallback(() => {
    const unsavedFiles: {
      path: string;
      content: string;
    }[] = [];

    if (hasUnsavedChanges && selectedFile) {
      unsavedFiles.push({
        path: selectedFile.path,
        content: fileContent,
      });
    }

    Object.entries(drafts).forEach(([draftKey, draft]) => {
      const filePath = draft.filePath;
      if (!selectedFile || filePath !== selectedFile.path) {
        unsavedFiles.push({
          path: filePath,
          content: draft.content,
        });
      }
    });

    return unsavedFiles;
  }, [hasUnsavedChanges, selectedFile, fileContent, drafts]);

  return (
    <div className="h-full flex">
      <div className="w-80 border-r border-earth-100 flex flex-col">
        <div className="p-4 border-b border-earth-100">
          <h3 className="font-semibold text-earth-400 mb-2">Files</h3>
          <div className="text-sm text-earth-300">
            {repoOwner}/{repoName}
          </div>
        </div>
        <FileExplorer
          projectId={projectId}
          repoOwner={repoOwner}
          repoName={repoName}
          onFileSelect={loadFileContent}
          selectedFile={selectedFile}
          drafts={drafts}
          pendingCreates={pendingCreates}
          onFileCreate={handleFileCreate}
        />
      </div>

      {/* Media Panel */}
      {showMediaPanel && mediaPath && (
        <div className="w-72 border-r border-earth-100 flex flex-col">
          <MediaManager
            projectId={projectId}
            repoOwner={repoOwner}
            repoName={repoName}
            mediaPath={mediaPath}
            onImageSelect={insertImageMarkdown}
          />
        </div>
      )}

      {/* Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Editor Header */}
        <div className="p-4 border-b border-earth-100 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {selectedFile ? (
              <div>
                <h4 className="font-medium text-earth-400">
                  {selectedFile.name}
                </h4>
                <div className="text-sm text-earth-300">
                  {selectedFile.path}
                </div>
              </div>
            ) : (
              <div className="text-earth-300">Select a file to edit</div>
            )}
            {hasUnsavedChanges && (
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-orange-600">Unsaved changes</span>
              </div>
            )}
            {schemaErrors.length > 0 && (
              <div className="flex items-center space-x-2 bg-red-50 px-2 py-1 rounded border border-red-100">
                <svg
                  className="w-4 h-4 text-red-500"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-xs text-red-600 font-medium">
                  Schema Mismatch
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {hasUnsavedChanges && (
              <button
                onClick={saveDraft}
                className="px-3 py-1.5 text-sm bg-earth-100 text-earth-400 rounded-md hover:bg-earth-200 transition-colors"
              >
                Save Draft
              </button>
            )}
            {Object.keys(drafts).length > 0 && (
              <button
                onClick={() => {
                  // Restore the most recent draft
                  const draftKeys = Object.keys(drafts);
                  const mostRecentKey = draftKeys.reduce((a, b) =>
                    drafts[a].timestamp > drafts[b].timestamp ? a : b,
                  );
                  const draft = drafts[mostRecentKey];
                  setFileContent(draft.content);
                  setHasUnsavedChanges(true);
                  // Remove the restored draft
                  const newDrafts = { ...drafts };
                  delete newDrafts[mostRecentKey];
                  setDrafts(newDrafts);
                }}
                className="px-3 py-1.5 text-sm bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 transition-colors"
              >
                Restore Draft
              </button>
            )}
            <button
              onClick={() => {
                if (schemaErrors.length > 0) {
                  alert(
                    "Please fix schema errors: \n" + schemaErrors.join("\n"),
                  );
                  return;
                }
                setIsCommitPanelOpen(true);
              }}
              disabled={
                !isMounted ||
                (getUnsavedFiles().length === 0 &&
                  pendingCreates.length === 0) ||
                schemaErrors.length > 0
              }
              className="px-4 py-1.5 text-sm bg-earth-300 text-white rounded-md hover:bg-earth-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
            >
              Commit Changes (
              {isMounted ? getUnsavedFiles().length + pendingCreates.length : 0}
              )
            </button>
            {/* Media Panel Toggle */}
            <button
              onClick={() => setShowMediaPanel(!showMediaPanel)}
              className={`p-2 rounded-md transition-colors ${
                showMediaPanel
                  ? "bg-earth-200 text-earth-500"
                  : "text-earth-400 hover:bg-earth-100"
              }`}
              title={showMediaPanel ? "Hide media panel" : "Show media panel"}
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
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-400">
              <div className="text-red-700">{error}</div>
            </div>
          )}

          {schemaErrors.length > 0 && (
            <div className="px-4 py-2 bg-red-50 border-b border-red-100">
              <h5 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1">
                Schema Errors:
              </h5>
              <ul className="list-disc list-inside">
                {schemaErrors.map((err, i) => (
                  <li key={i} className="text-xs text-red-700">
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mdxError && (
            <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400">
              <div className="text-yellow-800">
                <strong>MDX Parsing Error:</strong> {mdxError}
                <div className="mt-2 text-sm flex items-center justify-between">
                  <span>
                    You can fix the errors in source mode and switch to rich
                    text mode when you are ready.
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        // Enhanced auto-fix for common issues
                        const fixedContent = fileContent
                          // Fix HTML tags with unquoted attributes
                          .replace(/<([^>]+)>/g, (match) => {
                            return (
                              match
                                // Quote numeric values
                                .replace(/(\w+)=(\d+)/g, '$1="$2"')
                                // Quote boolean values
                                .replace(/(\w+)=(true|false)/g, '$1="$2"')
                                // Quote other unquoted attributes
                                .replace(/(\w+)=([^"'\s>=]+)/g, '$1="$2"')
                                // Fix spacing issues
                                .replace(/\s+/g, " ")
                                .trim()
                            );
                          })
                          // Convert HTML comments to JSX comments
                          .replace(/<!--([\s\S]*?)-->/g, "{/*$1*/}")
                          // Remove DOCTYPE declarations
                          .replace(/<!DOCTYPE[^>]*>/gi, "")
                          // Escape standalone curly braces that aren't JSX
                          .replace(/{/g, "\\{")
                          .replace(/}/g, "\\}");
                        setFileContent(fixedContent);
                        setMdxError(null);
                      }}
                      className="px-2 py-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      Auto Fix
                    </button>
                    <button
                      onClick={() => setMdxError(null)}
                      className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <svg
                className="animate-spin h-10 w-10 text-earth-400"
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
              <div className="text-earth-300 font-medium anim-pulse">
                Loading file content...
              </div>
            </div>
          ) : selectedFile ? (
            <div className="h-full">
              {isMounted && EditorComponent ? (
                // Toast UI Editor
                <div className="h-full">
                  <EditorComponent
                    ref={setEditorRef}
                    initialValue={fileContent}
                    previewStyle="vertical"
                    height="100%"
                    initialEditType="markdown"
                    useCommandShortcut={true}
                    extendedAutolinks={true}
                    referenceDefinition={true}
                    hideModeSwitch={true}
                    onChange={() => {
                      if (editorRef) {
                        const content = editorRef.getInstance().getMarkdown();
                        handleContentChange(content);
                      }
                    }}
                    toolbarItems={[
                      ["heading", "bold", "italic", "strike"],
                      ["hr", "quote"],
                      ["ul", "ol", "task", "indent", "outdent"],
                      ["table", "image", "link"],
                      ["code", "codeblock"],
                      ["scrollSync"],
                    ]}
                  />
                </div>
              ) : (
                // Loading state during hydration
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <svg
                    className="animate-spin h-8 w-8 text-earth-300"
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
                  <div className="text-earth-300 font-medium anim-pulse">
                    Preparing editor...
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-earth-300">
              <div className="text-center">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-earth-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <h3 className="text-lg font-medium mb-2">No file selected</h3>
                <p>Choose a file from the explorer to start editing</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Commit Panel */}
      {isCommitPanelOpen && (
        <CommitPanel
          unsavedFiles={getUnsavedFiles()}
          onCommit={handleCommit}
          onClose={() => setIsCommitPanelOpen(false)}
        />
      )}

      {/* Draft Restore Modal */}
      {showDraftModal && pendingDraft && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold text-earth-500 mb-4">
              Unsaved Changes Found
            </h3>
            <p className="text-earth-300 mb-6">
              You have unsaved changes for this file from{" "}
              <span className="font-medium">
                {new Date(pendingDraft.timestamp).toLocaleString()}
              </span>
              . Would you like to restore them?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  // remove the draft
                  const draftKey = `${repoOwner}/${repoName}/${pendingDraft.filePath}`;
                  const newDrafts = { ...drafts };
                  delete newDrafts[draftKey];
                  setDrafts(newDrafts);
                  setShowDraftModal(false);
                  setPendingDraft(null);
                }}
                className="px-4 py-2 text-sm text-earth-300 border border-earth-200 rounded-md hover:bg-earth-50 transition-colors"
              >
                Discard Changes
              </button>
              <button
                onClick={() => {
                  // Restore the draft
                  setFileContent(pendingDraft.content);
                  setHasUnsavedChanges(true);
                  setShowDraftModal(false);
                  setPendingDraft(null);
                }}
                className="px-4 py-2 text-sm bg-earth-200 text-white rounded-md hover:bg-earth-400 transition-colors"
              >
                Restore Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MDXEditorToast;
