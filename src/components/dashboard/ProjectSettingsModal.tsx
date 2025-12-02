import React, { useState } from "react";
import api from "@/lib/clients";
import Collaborators from "./Collaborators";

interface ProjectSettingsModalProps {
	projectId: string;
}

export default function ProjectSettingsModal({
	projectId,
}: ProjectSettingsModalProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [allowedDirs, setAllowedDirs] = useState("");
	const [settings, setSettings] = useState<any>(null);
	const [activeTab, setActiveTab] = useState<"general" | "collaborators">("general");

	const fetchSettings = async () => {
		setLoading(true);
		try {
			const res = await (api.projects as any)[projectId].settings.$get();
			if (res.ok) {
				const data = await res.json();
				setSettings(data.data);
				const dirs = JSON.parse(data.data.public_directories || "[]");
				setAllowedDirs(dirs.join("\n"));
			}
		} catch (e) {
			console.error("Failed to fetch settings", e);
		} finally {
			setLoading(false);
		}
	};

	const handleOpen = () => {
		setIsOpen(true);
		setActiveTab("general");
		fetchSettings();
	};

	const handleSave = async () => {
		setSaving(true);
		try {
			const dirs = allowedDirs
				.split("\n")
				.map((d) => d.trim())
				.filter((d) => d);

			const payload = {
				public_directories: JSON.stringify(dirs),
				allow_file_creation: settings?.allow_file_creation ?? false,
				allow_file_editing: settings?.allow_file_editing ?? true,
				allow_file_deletion: settings?.allow_file_deletion ?? false,
				require_approval: settings?.require_approval ?? true,
				auto_merge: settings?.auto_merge ?? false,
				max_file_size: settings?.max_file_size ?? 1048576,
				allowed_extensions:
					settings?.allowed_extensions ??
					JSON.stringify([".md"]),
				collaborator_message: settings?.collaborator_message ?? "",
			};

			const res = await (api.projects as any)[projectId].settings.$put({
				json: payload,
			});

			if (res.ok) {
				setIsOpen(false);
				window.dispatchEvent(new Event("project-settings-updated"));
			} else {
				alert("Failed to save settings");
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
						stroke-width={2}
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
				Settings
			</button>

			{isOpen && (
				<div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50">
					<div className="bg-white rounded-lg p-6 w-[600px] max-h-[90vh] overflow-y-auto shadow-xl border border-earth-100 flex flex-col">
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
										stroke-width={2}
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
						</div>

						{/* Tabs */}
						<div className="flex border-b border-earth-100 mb-6">
							<button
								className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "general"
									? "border-earth-500 text-earth-500"
									: "border-transparent text-earth-300 hover:text-earth-400"
									}`}
								onClick={() => setActiveTab("general")}
							>
								General
							</button>
							<button
								className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "collaborators"
									? "border-earth-500 text-earth-500"
									: "border-transparent text-earth-300 hover:text-earth-400"
									}`}
								onClick={() => setActiveTab("collaborators")}
							>
								Collaborators
							</button>
						</div>

						{loading ? (
							<div className="flex justify-center py-8">
								<div className="text-earth-300">Loading settings...</div>
							</div>
						) : (
							<div className="flex-1">
								{activeTab === "general" && (
									<div className="space-y-4">
										<div>
											<label className="block text-sm font-medium text-earth-400 mb-2">
												Allowed Directories
											</label>
											<p className="text-xs text-earth-300 mb-2">
												Enter one directory path per line (e.g.,{" "}
												<code>content/blog</code>). Only files in these
												directories will be accessible.
											</p>
											<textarea
												value={allowedDirs}
												onChange={(e) => setAllowedDirs(e.target.value)}
												className="w-full h-32 px-3 py-2 border border-earth-200 rounded-md focus:outline-none focus:ring-2 focus:ring-earth-400 focus:border-transparent text-sm font-mono"
												placeholder="content/posts&#10;public/images"
											/>
										</div>

										<div className="flex justify-end space-x-3 pt-4 border-t border-earth-100">
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
															stroke-width="4"
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
									</div>
								)}

								{activeTab === "collaborators" && (
									<Collaborators projectId={projectId} />
								)}
							</div>
						)}
					</div>
				</div>
			)}
		</>
	);
}
