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

interface DirectoryConfig {
	path: string;
	schema?: Record<string, any>;
	naming_convention?: string;
	base_image_path?: string;
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
	const [repoConfig, setRepoConfig] = useState<DirectoryConfig[]>([]);
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
	const [isCreating, setIsCreating] = useState(false);
	const [baseImagePath, setBaseImagePath] = useState<string>("");

	// Load entire file tree recursively on mount
	const loadFileTree = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await (api.projects as any)[projectId].repo[repoOwner][
				repoName
			].tree.$get();

			if (!response.ok) {
				throw new Error(`Failed to load file tree: ${response.statusText}`);
			}

			const data = await response.json();
			const { tree, config } = data.data;

			// Set config
			setRepoConfig(config || []);

			// Extract base image path from config (first dir with base_image_path or default)
			const firstWithImagePath = config?.find((c: DirectoryConfig) => c.base_image_path);
			if (firstWithImagePath?.base_image_path) {
				setBaseImagePath(firstWithImagePath.base_image_path);
			}

			// Mark all directories as expanded by default
			const expandAll = (nodes: DirectoryNode[]): DirectoryNode[] => {
				return nodes.map((node) => ({
					...node,
					expanded: true,
					children: node.children ? expandAll(node.children) : undefined,
				}));
			};

			const expandedTree = expandAll(tree || []);
			setRootContents(expandedTree);

			// Pre-expand all paths
			const collectPaths = (nodes: DirectoryNode[]): string[] => {
				return nodes.reduce((acc: string[], node) => {
					if (node.type === "dir") {
						acc.push(node.path);
						if (node.children) {
							acc.push(...collectPaths(node.children));
						}
					}
					return acc;
				}, []);
			};
			setExpandedDirs(new Set(collectPaths(expandedTree)));
		} catch (err) {
			console.error("Error loading file tree:", err);
			setError(err instanceof Error ? err.message : "Failed to load files");
		} finally {
			setIsLoading(false);
			setSettingsLoaded(true);
		}
	}, [projectId, repoOwner, repoName]);

	useEffect(() => {
		loadFileTree();
	}, [loadFileTree]);

	// Reload on settings update
	useEffect(() => {
		const handleSettingsUpdate = () => {
			loadFileTree();
		};

		window.addEventListener("project-settings-updated", handleSettingsUpdate);
		return () => {
			window.removeEventListener(
				"project-settings-updated",
				handleSettingsUpdate,
			);
		};
	}, [loadFileTree]);

	const toggleDirectory = (dirPath: string) => {
		const isExpanded = expandedDirs.has(dirPath);
		const newExpandedDirs = new Set(expandedDirs);

		if (isExpanded) {
			newExpandedDirs.delete(dirPath);
		} else {
			newExpandedDirs.add(dirPath);
		}

		setExpandedDirs(newExpandedDirs);

		// Update tree expanded state
		setRootContents((prevTree) => {
			const updateNode = (nodes: DirectoryNode[]): DirectoryNode[] => {
				return nodes.map((node) => {
					if (node.path === dirPath) {
						return { ...node, expanded: !isExpanded };
					}
					if (node.children) {
						return { ...node, children: updateNode(node.children) };
					}
					return node;
				});
			};
			return updateNode(prevTree);
		});
	};

	const handleFileClick = (file: DirectoryNode) => {
		if (file.type === "dir") {
			toggleDirectory(file.path);
		} else {
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

	const handleContextMenu = (e: React.MouseEvent, node: DirectoryNode) => {
		e.preventDefault();
		setContextMenu({
			x: e.clientX,
			y: e.clientY,
			path: node.path,
			type: node.type === "dir" ? "dir" : "file",
		});
	};

	useEffect(() => {
		const handleClick = () => setContextMenu(null);
		document.addEventListener("click", handleClick);
		return () => document.removeEventListener("click", handleClick);
	}, []);

	const validateFileName = (name: string, convention: string) => {
		switch (convention) {
			case "kebab-case":
				return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(name);
			case "snake_case":
				return /^[a-z0-9]+(_[a-z0-9]+)*$/.test(name);
			case "camelCase":
				return /^[a-z][a-zA-Z0-9]*$/.test(name);
			default:
				return true;
		}
	};

	const handleCreate = async () => {
		if (!newItemName.trim() || isCreating) return;

		setIsCreating(true);
		const fullPath = createPath ? `${createPath}/${newItemName}` : newItemName;

		try {
			// Find applicable config
			const config = repoConfig.find(
				(c) =>
					fullPath.startsWith(c.path + "/") ||
					fullPath === c.path ||
					createPath === c.path,
			);

			if (createType === "file" && config?.naming_convention) {
				// Remove extension
				const nameWithoutExt = newItemName.includes(".")
					? newItemName.split(".").slice(0, -1).join(".")
					: newItemName;

				if (
					!validateFileName(nameWithoutExt, config.naming_convention)
				) {
					throw new Error(
						`File name must follow ${config.naming_convention} convention`,
					);
				}
			}

			if (onFileCreate) {
				onFileCreate(fullPath, createType);
			} else {
				if (createType === "file") {
					let initialContent = "";
					if (config?.schema) {
						try {
							const yaml = await import("yaml");
							const frontmatter: Record<string, any> = {};

							Object.entries(config.schema).forEach(
								([key, schema]: [string, any]) => {
									if (schema.type === "date") {
										frontmatter[key] = new Date()
											.toISOString()
											.split("T")[0];
									} else if (schema.type === "string") {
										let placeholder = "";
										if (schema.min)
											placeholder = "x".repeat(schema.min);
										frontmatter[key] = placeholder || "";
									} else if (schema.type === "boolean") {
										frontmatter[key] = false;
									} else {
										frontmatter[key] = "";
									}
								},
							);

							initialContent = `---\n${yaml.stringify(frontmatter)}---\n\n# New Content\n`;
						} catch (e) {
							console.warn("Failed to generate frontmatter", e);
						}
					}

					const response = await (api.projects as any)[projectId].repo[
						repoOwner
					][repoName]["create-file"].$post({
						json: {
							path: fullPath,
							content: btoa(initialContent),
							message: `Create ${fullPath}`,
						},
					});
					if (!response.ok) {
						const errData = await response.json();
						throw new Error(errData.message || response.statusText);
					}
					// Reload tree to show new file
					loadFileTree();
				} else {
					alert(
						"Cannot create empty folder on server. Please create a file inside it.",
					);
					return;
				}
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

	const hasDraft = (filePath: string) => {
		const draftKey = `${repoOwner}/${repoName}/${filePath}`;
		return !!drafts[draftKey];
	};

	const mergePending = useCallback(
		(nodes: DirectoryNode[] = [], dirPath: string): DirectoryNode[] => {
			const pendingInDir = pendingCreates.filter((p) => {
				const parentPath = p.path.split("/").slice(0, -1).join("/");
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

			// filter out pending nodes that might duplicate existing server nodes
			const uniquePending = pendingNodes.filter(
				(p) => !nodes.some((n) => n.path === p.path),
			);

			const merged = [...nodes, ...uniquePending];

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

	const renderTree = (
		nodes: DirectoryNode[],
		level: number = 0,
		parentPath: string = "",
	): React.ReactNode => {
		const nodesToRender = level === 0 ? nodes : mergePending(nodes, parentPath);

		return nodesToRender.map((node) => (
			<div key={node.path}>
				<div
					className={`group flex items-center px-2 py-1 rounded-md transition-all duration-200 ${
						selectedFile?.path === node.path
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
							className={`w-4 h-4 mr-2 transition-transform ${
								expandedDirs.has(node.path) ? "rotate-90" : ""
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

				{node.type === "dir" &&
					expandedDirs.has(node.path) &&
					node.children &&
					node.children.length > 0 && (
						<div>{renderTree(node.children, level + 1, node.path)}</div>
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

	if (settingsLoaded && (!repoConfig || repoConfig.length === 0)) {
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
			{/* File Tree */}
			<div className="flex-1 overflow-y-auto p-2">
				{rootContents.length === 0 ? (
					<div className="text-center py-8 text-earth-300">
						No files found in allowed directories.
					</div>
				) : (
					renderTree(rootContents)
				)}
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
