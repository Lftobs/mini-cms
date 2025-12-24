import { Editor } from "@toast-ui/react-editor";
import type React from "react";
import { useCallback, useEffect, useState } from "react";
import "@toast-ui/editor/dist/toastui-editor.css";
import { actions } from "astro:actions";
import api from "@/lib/clients";
import CommitPanel from "./CommitPanel.tsx";
import FileExplorer from "./FileExplorer.tsx";

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
	const [isMounted, setIsMounted] = useState(false);
	const [editorRef, setEditorRef] = useState<any>(null);
	const [showDraftModal, setShowDraftModal] = useState(false);
	const [pendingDraft, setPendingDraft] = useState<{
		content: string;
		timestamp: number;
		filePath: string;
	} | null>(null);
	const [pendingCreates, setPendingCreates] = useState<
		Array<{ path: string; type: "file" | "folder" }>
	>([]);

	// Mount tracking for hydration fix
	useEffect(() => {
		// console.log("[MDXEditorToast] Component mounted", {
		// 	projectId,
		// 	repoOwner,
		// 	repoName,
		// });
		setIsMounted(true);
	}, [projectId, repoOwner, repoName]);


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
							onClick={() => setIsCommitPanelOpen(true)}
							disabled={
								!isMounted ||
								(getUnsavedFiles().length === 0 && pendingCreates.length === 0)
							}
							className="px-4 py-1.5 text-sm bg-earth-300 text-white rounded-md hover:bg-earth-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
						>
							Commit Changes (
							{isMounted ? getUnsavedFiles().length + pendingCreates.length : 0}
							)
						</button>
					</div>
				</div>

				{/* Editor Content */}
				<div className="flex-1 overflow-hidden">
					{error && (
						<div className="p-4 bg-red-50 border-l-4 border-red-400">
							<div className="text-red-700">{error}</div>
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
						<div className="flex items-center justify-center h-full">
							<div className="text-earth-300">Loading...</div>
						</div>
					) : selectedFile ? (
						<div className="h-full">
							{isMounted ? (
								// Toast UI Editor
								<div className="h-full">
									<Editor
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
								<div className="flex items-center justify-center h-full">
									<div className="text-earth-300">Loading editor...</div>
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
