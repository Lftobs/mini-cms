import type React from "react";
import { useCallback, useEffect, useState } from "react";
import api from "@/lib/clients";

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

interface FileExplorerProps {
	projectId: string;
	repoOwner: string;
	repoName: string;
	onFileSelect: (file: FileItem) => void;
	selectedFile: FileItem | null;
	drafts: Record<string, DraftData>;
	pendingCreates?: Array<{ path: string; type: "file" | "folder" }>;
	onFileCreate?: (path: string, type: "file" | "folder") => void;
}

interface DirectoryNode {
	name: string;
	path: string;
	type: "file" | "dir";
	children?: DirectoryNode[];
	expanded?: boolean;
	size: number;
	sha: string;
	isPending?: boolean;
}

const FileExplorer: React.FC<FileExplorerProps> = ({
	projectId,
	repoOwner,
	repoName,
	onFileSelect,
	selectedFile,
	drafts,
	pendingCreates = [],
	onFileCreate,
}) => {
	const [rootContents, setRootContents] = useState<DirectoryNode[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
	const [allowedDirectories, setAllowedDirectories] = useState<string[] | null>(
		null,
	);
	const [settingsLoaded, setSettingsLoaded] = useState(false);
	const [showCreateModal, setShowCreateModal] = useState(false);
	const [createType, setCreateType] = useState<"file" | "folder">("file");
	const [createPath, setCreatePath] = useState("");
	const [newItemName, setNewItemName] = useState("");
	const [contextMenu, setContextMenu] = useState<{
		x: number;
		y: number;
		path: string;
		type: "file" | "dir";
	} | null>(null);

	// Load directory contents
	const loadDirectoryContents = useCallback(
		async (path: string = "") => {
			try {
				const response = await (api.projects as any)[projectId].repo[repoOwner][
					repoName
				].contents.$get({
					query: path ? { path } : {},
				});

				if (!response.ok) {
					throw new Error(`Failed to load directory: ${response.statusText}`);
				}

				const data = await response.json();
				return data.data as FileItem[];
			} catch (err) {
				console.error("Error loading directory:", err);
				throw err;
			}
		},
		[projectId, repoOwner, repoName],
	);

	const fetchSettings = useCallback(async () => {
		try {
			// console.log("[FileExplorer] Fetching settings for project:", projectId);
			const response = await (api.projects as any)[projectId].settings.$get();

			// console.log("[FileExplorer] Settings response status:", response.status);
			if (!response.ok) {
				const errorText = await response.text();
				console.error("[FileExplorer] Settings fetch failed:", errorText);
				throw new Error("Failed to fetch project settings");
			}

			const data = await response.json();
			// console.log("[FileExplorer] Settings data:", data);
			const settings = data.data;
			const dirs = JSON.parse(settings.public_directories || "[]");
			// console.log("[FileExplorer] Allowed directories:", dirs);
			setAllowedDirectories(dirs);
			setSettingsLoaded(true);
			return dirs;
		} catch (err) {
			console.error("[FileExplorer] Error fetching settings:", err);
			// Fallback to empty if error
			setAllowedDirectories([]);
			setSettingsLoaded(true);
			return [];
		}
	}, [projectId]);

	// Build tree structure from flat file list
	const buildTree = useCallback(
		(items: FileItem[], dirPath: string = ""): DirectoryNode[] => {
			// Start with server items
			const nodes: DirectoryNode[] = items.map((item) => ({
				name: item.name,
				path: item.path,
				type: item.type,
				size: item.size,
				sha: item.sha,
				children: item.type === "dir" ? [] : undefined,
				expanded: expandedDirs.has(item.path),
			}));

			// Merge pending creates that belong to this directory
			const pendingInDir = pendingCreates.filter((p) => {
				const parentPath = p.path.split("/").slice(0, -1).join("/");
				return parentPath === dirPath;
			});

			pendingInDir.forEach((p) => {
				// Avoid duplicates if file already exists on server (though unlikely for new creates)
				if (!nodes.some((n) => n.path === p.path)) {
					nodes.push({
						name: p.path.split("/").pop() || "",
						path: p.path,
						type: p.type === "folder" ? "dir" : "file",
						size: 0,
						sha: "",
						children: p.type === "folder" ? [] : undefined,
						expanded: expandedDirs.has(p.path),
						isPending: true,
					});
				}
			});

			// Sort: directories first, then files, both alphabetically
			nodes.sort((a, b) => {
				if (a.type !== b.type) {
					return a.type === "dir" ? -1 : 1;
				}
				return a.name.localeCompare(b.name);
			});

			return nodes;
		},
		[pendingCreates, expandedDirs],
	);

	// Load root directory on mount
	useEffect(() => {
		const loadRoot = async () => {
			setIsLoading(true);
			setError(null);

			try {
				const dirs = await fetchSettings();

				if (dirs && dirs.length > 0) {
					// For root, we just show the allowed directories as roots
					// We need to check if any pending creates are at the root level (unlikely given allowed dirs constraint)
					// But actually, allowed dirs are the roots.
					// Pending creates will be inside these dirs.

					const nodes: DirectoryNode[] = dirs.map((dir: string) => ({
						name: dir,
						path: dir,
						type: "dir",
						size: 0,
						sha: "",
						children: undefined,
						expanded: false,
					}));
					setRootContents(nodes);
				}
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load files");
			} finally {
				setIsLoading(false);
			}
		};

		loadRoot();
	}, [loadDirectoryContents, fetchSettings]);

	// ... (reload effect remains same) ...

	useEffect(() => {
		const handleSettingsUpdate = () => {
			// Reload settings and files
			const reload = async () => {
				setIsLoading(true);
				try {
					const dirs = await fetchSettings();
					if (dirs && dirs.length > 0) {
						const nodes: DirectoryNode[] = dirs.map((dir: string) => ({
							name: dir,
							path: dir,
							type: "dir",
							size: 0,
							sha: "",
							children: undefined,
							expanded: false,
						}));
						setRootContents(nodes);
					} else {
						setRootContents([]);
					}
				} catch (err) {
					console.error("Error reloading:", err);
				} finally {
					setIsLoading(false);
				}
			};
			reload();
		};

		window.addEventListener("project-settings-updated", handleSettingsUpdate);
		return () => {
			window.removeEventListener(
				"project-settings-updated",
				handleSettingsUpdate,
			);
		};
	}, [fetchSettings, loadDirectoryContents]);

	// Toggle directory expansion
	const toggleDirectory = async (dirPath: string) => {
		const isExpanded = expandedDirs.has(dirPath);
		const newExpandedDirs = new Set(expandedDirs);

		if (isExpanded) {
			newExpandedDirs.delete(dirPath);
			setRootContents((prevTree) => {
				const updateNode = (nodes: DirectoryNode[]): DirectoryNode[] => {
					return nodes.map((node) => {
						if (node.path === dirPath) {
							return {
								...node,
								expanded: false,
							};
						}
						if (node.children) {
							return {
								...node,
								children: updateNode(node.children),
							};
						}
						return node;
					});
				};
				return updateNode(prevTree);
			});
		} else {
			newExpandedDirs.add(dirPath);

			// Load directory contents if not already loaded
			try {
				// If it's a pending directory, it has no server contents yet
				const isPendingDir = pendingCreates.some(
					(p) => p.path === dirPath && p.type === "folder",
				);

				let contents: FileItem[] = [];
				if (!isPendingDir) {
					contents = await loadDirectoryContents(dirPath);
				}

				setRootContents((prevTree) => {
					const updateNode = (nodes: DirectoryNode[]): DirectoryNode[] => {
						return nodes.map((node) => {
							if (node.path === dirPath && node.type === "dir") {
								return {
									...node,
									children: buildTree(contents, dirPath),
									expanded: true,
								};
							}
							if (node.children) {
								return {
									...node,
									children: updateNode(node.children),
								};
							}
							return node;
						});
					};
					return updateNode(prevTree);
				});
			} catch (err) {
				console.error("Failed to load directory contents:", err);
				return;
			}
		}

		setExpandedDirs(newExpandedDirs);
	};

	// ... (handleFileClick, handleContextMenu, useEffect remain same) ...

	// Handle file selection
	const handleFileClick = (file: DirectoryNode) => {
		if (file.type === "dir") {
			toggleDirectory(file.path);
		} else {
			// Don't allow selecting the same file that's already selected
			if (selectedFile?.path === file.path) {
				return;
			}
			onFileSelect({
				name: file.name,
				path: file.path,
				type: "file",
				size: file.size,
				sha: file.sha,
			});
		}
	};

	// Handle context menu
	const handleContextMenu = (e: React.MouseEvent, node: DirectoryNode) => {
		e.preventDefault();
		setContextMenu({
			x: e.clientX,
			y: e.clientY,
			path: node.path,
			type: node.type === "dir" ? "dir" : "file",
		});
	};

	// Close context menu
	useEffect(() => {
		const handleClick = () => setContextMenu(null);
		document.addEventListener("click", handleClick);
		return () => document.removeEventListener("click", handleClick);
	}, []);

	const [isCreating, setIsCreating] = useState(false);

	// Create new file or folder
	const handleCreate = async () => {
		if (!newItemName.trim() || isCreating) return;

		setIsCreating(true);
		const fullPath = createPath ? `${createPath}/${newItemName}` : newItemName;

		try {
			if (onFileCreate) {
				// Client-side creation
				onFileCreate(fullPath, createType);

				// We need to refresh the view to show the new item
				// Since pendingCreates prop will update, the effect or re-render should handle it
				// But we need to make sure the parent directory is expanded and re-rendered

				// If we created in a subdirectory, we might need to trigger a refresh of that node
				// But since pendingCreates is passed down, we just need to re-run buildTree for the visible nodes.
				// React will handle the re-render when props change.
				// However, if the parent dir wasn't expanded, we might want to expand it?
				// For now, let's assume the user is creating in a visible context or we just rely on the user to expand.

				// Actually, if we are creating in `createPath`, that path is likely visible (since we clicked a button on it).

				// We might need to force update the tree to include the new pending item immediately if it doesn't happen automatically.
				// But `buildTree` depends on `pendingCreates`, so when parent updates `pendingCreates`, this component re-renders, calling `buildTree` again?
				// Wait, `buildTree` is called inside `toggleDirectory` and `loadRoot`.
				// We need to update `rootContents` when `pendingCreates` changes.

				// Let's add an effect to update tree when pendingCreates changes?
				// Or just rely on the fact that we are modifying the tree structure.
				// Actually, `rootContents` is state. We need to update it.
				// But `rootContents` is a deep structure.
				// A simple way is to re-fetch/re-build the currently expanded directories.
				// Or simpler: just close the modal and let the user see it.
				// Wait, if we don't update `rootContents`, the new item won't show up!

				// We need a way to inject the new item into `rootContents`.
				// Since `pendingCreates` is a prop, we can use an effect to update `rootContents` when it changes.
				// But `rootContents` contains the full tree.
				// Re-building the whole tree is hard because we don't have all the data (it's loaded on demand).

				// Strategy:
				// When `pendingCreates` changes, we can traverse `rootContents` and inject the new items if their parent is expanded.
				// Or, we can just trigger a re-render of the relevant nodes.

				// Let's try to update `rootContents` by re-mapping it with `buildTree` logic?
				// No, `buildTree` takes a flat list.

				// Let's just manually inject into `rootContents` for now in `handleCreate`?
				// No, `pendingCreates` comes from parent.

				// Let's add an effect that runs when `pendingCreates` changes.
				// It will traverse `rootContents` and add missing pending items.
			} else {
				// Server-side creation (fallback)
				if (createType === "file") {
					// ... existing server logic ...
					const response = await (api.projects as any)[projectId].repo[
						repoOwner
					][repoName]["create-file"].$post({
						json: {
							path: fullPath,
							content: btoa(""),
							message: `Create ${fullPath}`,
						},
					});
					if (!response.ok) throw new Error(response.statusText);
				} else {
					// Folder creation on server requires a file (git limitation)
					// Since we don't want .gitkeep, we can't create an empty folder on server.
					// We'll just return or show a message.
					alert(
						"Cannot create empty folder on server. Please create a file inside it.",
					);
					return;
				}
				// Refresh the file tree
				const contents = await loadDirectoryContents();
				// This only reloads root. We might need to reload specific dir.
				// But existing logic was `setRootContents(buildTree(contents))`.
			}

			setShowCreateModal(false);
			setNewItemName("");
			setCreatePath("");
		} catch (err) {
			alert(err instanceof Error ? err.message : "Failed to create item");
		} finally {
			setIsCreating(false);
		}
	};

	// Check if file has draft
	const hasDraft = (filePath: string) => {
		const draftKey = `${repoOwner}/${repoName}/${filePath}`;
		return !!drafts[draftKey];
	};

	// Helper to merge pending creates into the tree during render
	const mergePending = useCallback(
		(nodes: DirectoryNode[] = [], dirPath: string): DirectoryNode[] => {
			const pendingInDir = pendingCreates.filter((p) => {
				const parentPath = p.path.split("/").slice(0, -1).join("/");
				// Handle root level pending creates (if any)
				if (dirPath === "" && !p.path.includes("/")) return true;
				return parentPath === dirPath;
			});

			const pendingNodes: DirectoryNode[] = pendingInDir.map((p) => ({
				name: p.path.split("/").pop() || "",
				path: p.path,
				type: p.type === "folder" ? "dir" : "file",
				size: 0,
				sha: "",
				children: p.type === "folder" ? [] : undefined,
				expanded: expandedDirs.has(p.path),
				isPending: true,
			}));

			// Filter out pending nodes that might duplicate existing server nodes (unlikely but safe)
			const uniquePending = pendingNodes.filter(
				(p) => !nodes.some((n) => n.path === p.path),
			);

			const merged = [...nodes, ...uniquePending];

			// Sort merged list
			merged.sort((a, b) => {
				if (a.type !== b.type) {
					return a.type === "dir" ? -1 : 1;
				}
				return a.name.localeCompare(b.name);
			});

			return merged;
		},
		[pendingCreates, expandedDirs],
	);

	// Render file tree recursively
	const renderTree = (
		nodes: DirectoryNode[],
		level: number = 0,
		parentPath: string = "",
	): React.ReactNode => {
		// Merge pending files for this level
		// Note: For the root call, we might need to handle it differently if rootContents are just the allowed dirs.
		// If rootContents are allowed dirs, they are effectively roots.
		// Pending files will be inside them.
		// So we only need to merge when rendering children of a directory.
		// However, if we support creating files at the very top level (outside allowed dirs?), that would be an issue.
		// But we assume all creations are within allowed dirs.

		// If level is 0, nodes are the allowed directories. We don't merge pending files here
		// unless they are siblings of allowed directories (which shouldn't happen).
		// But inside each allowed directory, we need to merge.

		const nodesToRender = level === 0 ? nodes : mergePending(nodes, parentPath);

		return nodesToRender.map((node) => (
			<div key={node.path}>
				<div
					className={`group flex items-center px-2 py-1 rounded-md transition-all duration-200 ${selectedFile?.path === node.path
						? "bg-earth-100 text-earth-500 cursor-default shadow-sm"
						: "text-earth-400 cursor-pointer hover:bg-earth-50 hover:text-earth-500 hover:shadow-sm hover:scale-[1.02]"
						} ${node.isPending ? "opacity-70 italic" : ""}`}
					style={{
						paddingLeft: `${level * 16 + 8}px`,
					}}
					onClick={() => handleFileClick(node)}
					onContextMenu={(e) => handleContextMenu(e, node)}
				>
					{node.type === "dir" ? (
						<svg
							className={`w-4 h-4 mr-2 transition-transform ${node.expanded ? "rotate-90" : ""
								}`}
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M9 5l7 7-7 7"
							/>
						</svg>
					) : (
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
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
					)}

					<span className="flex-1 truncate">
						{node.name}
						{node.isPending && " (pending)"}
					</span>

					{node.type === "file" && hasDraft(node.path) && (
						<div
							className="w-2 h-2 bg-orange-500 rounded-full ml-2"
							title="Has unsaved changes"
						></div>
					)}

					{node.type === "dir" && (
						<div className="flex space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
							<button
								onClick={(e) => {
									e.stopPropagation();
									setCreateType("file");
									setCreatePath(node.path);
									setShowCreateModal(true);
								}}
								className="p-1 hover:bg-earth-200 rounded text-earth-400 hover:text-earth-600"
								title="Create file in this folder"
							>
								<svg
									className="w-3 h-3"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M12 4v16m8-8H4"
									/>
								</svg>
							</button>
							<button
								onClick={(e) => {
									e.stopPropagation();
									setCreateType("folder");
									setCreatePath(node.path);
									setShowCreateModal(true);
								}}
								className="p-1 hover:bg-earth-200 rounded text-earth-400 hover:text-earth-600"
								title="Create folder in this folder"
							>
								<svg
									className="w-3 h-3"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
									/>
								</svg>
							</button>
						</div>
					)}
				</div>

				{node.type === "dir" && node.expanded && (
					<div>{renderTree(node.children || [], level + 1, node.path)}</div>
				)}
			</div>
		));
	};

	if (isLoading) {
		return (
			<div className="flex-1 flex items-center justify-center">
				<div className="text-earth-300">Loading files...</div>
			</div>
		);
	}

	if (
		settingsLoaded &&
		(!allowedDirectories || allowedDirectories.length === 0)
	) {
		return (
			<div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
				<div className="w-12 h-12 bg-earth-100 rounded-full flex items-center justify-center mb-4">
					<svg
						className="w-6 h-6 text-earth-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
						/>
					</svg>
				</div>
				<h3 className="text-lg font-medium text-earth-500 mb-2">
					No directories configured
				</h3>
				<p className="text-sm text-earth-300 max-w-xs">
					No directory to fetch from. Try updating your settings to include dirs
					you want to work with.
				</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex-1 p-4">
				<div className="text-red-600 text-sm">{error}</div>
			</div>
		);
	}

	return (
		<div className="flex-1 flex flex-col">
			{/* Action Buttons */}
			<div className="p-4 border-b border-earth-100">
				<div className="flex space-x-2">
					<button
						onClick={() => {
							setCreateType("file");
							setCreatePath("");
							setShowCreateModal(true);
						}}
						className="flex items-center px-3 py-1.5 text-sm bg-earth-50 text-earth-400 rounded-md hover:bg-earth-100 transition-colors"
						title="Create new file"
					>
						<svg
							className="w-4 h-4 mr-1"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 6v6m0 0v6m0-6h6m-6 0H6"
							/>
						</svg>
						File
					</button>
					<button
						onClick={() => {
							setCreateType("folder");
							setCreatePath("");
							setShowCreateModal(true);
						}}
						className="flex items-center px-3 py-1.5 text-sm bg-earth-50 text-earth-400 rounded-md hover:bg-earth-100 transition-colors"
						title="Create new folder"
					>
						<svg
							className="w-4 h-4 mr-1"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M12 6v6m0 0v6m0-6h6m-6 0H6"
							/>
						</svg>
						Folder
					</button>
				</div>
			</div>

			{/* File Tree */}
			<div className="flex-1 overflow-y-auto p-2">
				{renderTree(rootContents)}
			</div>

			{/* Context Menu */}
			{contextMenu && (
				<div
					className="fixed bg-white border border-earth-200 rounded-md shadow-lg py-1 z-50"
					style={{
						left: contextMenu.x,
						top: contextMenu.y,
					}}
				>
					<button
						className="w-full px-4 py-2 text-left text-sm hover:bg-earth-50"
						onClick={() => {
							setCreateType("file");
							setCreatePath(
								contextMenu.type === "dir"
									? contextMenu.path
									: contextMenu.path.split("/").slice(0, -1).join("/"),
							);
							setShowCreateModal(true);
							setContextMenu(null);
						}}
					>
						New File
					</button>
					<button
						className="w-full px-4 py-2 text-left text-sm hover:bg-earth-50"
						onClick={() => {
							setCreateType("folder");
							setCreatePath(
								contextMenu.type === "dir"
									? contextMenu.path
									: contextMenu.path.split("/").slice(0, -1).join("/"),
							);
							setShowCreateModal(true);
							setContextMenu(null);
						}}
					>
						New Folder
					</button>
				</div>
			)}

			{/* Create Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-96">
						<h3 className="text-lg font-semibold text-earth-400 mb-4">
							Create New {createType === "file" ? "File" : "Folder"}
						</h3>

						<div className="mb-4">
							<label className="block text-sm font-medium text-earth-300 mb-2">
								{createType === "file" ? "File" : "Folder"} Name
							</label>
							<input
								type="text"
								value={newItemName}
								onChange={(e) => setNewItemName(e.target.value)}
								placeholder={
									createType === "file" ? "example.md" : "folder-name"
								}
								className="w-full px-3 py-2 border border-earth-200 rounded-md focus:outline-none focus:ring-2 focus:ring-earth-400 focus:border-transparent"
								autoFocus
								disabled={isCreating}
								onKeyPress={(e) => {
									if (e.key === "Enter") {
										handleCreate();
									}
								}}
							/>
							{createPath && (
								<div className="text-sm text-earth-300 mt-1">
									Will be created in: {createPath}/
								</div>
							)}
						</div>

						<div className="flex justify-end space-x-3">
							<button
								onClick={() => {
									setShowCreateModal(false);
									setNewItemName("");
									setCreatePath("");
								}}
								disabled={isCreating}
								className="px-4 py-2 text-sm text-earth-300 border border-earth-200 rounded-md hover:bg-earth-50 transition-colors disabled:opacity-50"
							>
								Cancel
							</button>
							<button
								onClick={() => handleCreate()}
								disabled={isCreating}
								className="px-4 py-2 text-sm bg-earth-400 text-white rounded-md hover:bg-earth-300 transition-colors disabled:opacity-50 flex items-center"
							>
								{isCreating && (
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
								Create
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default FileExplorer;
