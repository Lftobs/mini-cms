import type React from "react";
import { useState } from "react";

interface CommitPanelProps {
	unsavedFiles: { path: string; content: string }[];
	onCommit: (
		commitMessage: string,
		filesToCommit: { path: string; content: string }[],
	) => Promise<void>;
	onClose: () => void;
}

const CommitPanel: React.FC<CommitPanelProps> = ({
	unsavedFiles,
	onCommit,
	onClose,
}) => {
	const [commitMessage, setCommitMessage] = useState("");
	const [selectedFiles, setSelectedFiles] = useState<Set<string>>(
		new Set(unsavedFiles.map((f) => f.path)),
	);
	const [isCommitting, setIsCommitting] = useState(false);

	const handleFileToggle = (filePath: string) => {
		const newSelectedFiles = new Set(selectedFiles);
		if (newSelectedFiles.has(filePath)) {
			newSelectedFiles.delete(filePath);
		} else {
			newSelectedFiles.add(filePath);
		}
		setSelectedFiles(newSelectedFiles);
	};

	const handleSelectAll = () => {
		if (selectedFiles.size === unsavedFiles.length) {
			setSelectedFiles(new Set());
		} else {
			setSelectedFiles(new Set(unsavedFiles.map((f) => f.path)));
		}
	};

	const handleCommit = async () => {
		if (!commitMessage.trim() || selectedFiles.size === 0) return;

		const filesToCommit = unsavedFiles.filter((file) =>
			selectedFiles.has(file.path),
		);

		setIsCommitting(true);
		try {
			await onCommit(commitMessage.trim(), filesToCommit);
		} catch (error) {
			console.error("Commit failed:", error);
		} finally {
			setIsCommitting(false);
		}
	};

	const getFileExtension = (filename: string) => {
		const parts = filename.split(".");
		return parts.length > 1 ? parts[parts.length - 1] : "";
	};

	const getFileIcon = (filename: string) => {
		const ext = getFileExtension(filename).toLowerCase();

		if (["md", "mdx"].includes(ext)) {
			return (
				<svg
					className="w-4 h-4 text-blue-500"
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
			);
		}

		if (["js", "jsx", "ts", "tsx"].includes(ext)) {
			return (
				<svg
					className="w-4 h-4 text-yellow-500"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
					/>
				</svg>
			);
		}

		return (
			<svg
				className="w-4 h-4 text-earth-400"
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
		);
	};

	return (
		<div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
				{/* Header */}
				<div className="p-6 border-b border-earth-100">
					<div className="flex items-center justify-between">
						<h2 className="text-xl font-semibold text-earth-400">
							Commit Changes
						</h2>
						<button
							onClick={onClose}
							className="p-2 text-earth-300 hover:text-earth-400 hover:bg-earth-50 rounded-md transition-colors"
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
					<p className="text-earth-300 mt-2">
						Select the files you want to commit and provide a commit message.
					</p>
				</div>

				{/* Content */}
				<div className="flex-1 overflow-hidden flex flex-col">
					{/* Files Section */}
					<div className="p-6 border-b border-earth-100">
						<div className="flex items-center justify-between mb-4">
							<h3 className="font-medium text-earth-400">
								Changed Files ({unsavedFiles.length})
							</h3>
							<button
								onClick={handleSelectAll}
								className="text-sm text-earth-400 hover:text-earth-500 font-medium"
							>
								{selectedFiles.size === unsavedFiles.length
									? "Deselect All"
									: "Select All"}
							</button>
						</div>

						<div className="space-y-2 max-h-40 overflow-y-auto">
							{unsavedFiles.map((file) => (
								<div
									key={file.path}
									className={`flex items-center p-3 rounded-md border transition-colors cursor-pointer ${selectedFiles.has(file.path)
										? "bg-earth-50 border-earth-200"
										: "bg-white border-earth-100 hover:bg-earth-25"
										}`}
									onClick={() => handleFileToggle(file.path)}
								>
									<input
										type="checkbox"
										checked={selectedFiles.has(file.path)}
										onChange={() => handleFileToggle(file.path)}
										className="mr-3 text-earth-400 focus:ring-earth-400 border-earth-300 rounded"
									/>

									<div className="flex items-center flex-1 min-w-0">
										{getFileIcon(file.path)}
										<div className="ml-3 min-w-0">
											<div className="text-sm font-medium text-earth-400 truncate">
												{file.path.split("/").pop()}
											</div>
											<div className="text-xs text-earth-300 truncate">
												{file.path}
											</div>
										</div>
									</div>

									<div className="ml-3 flex items-center text-xs text-earth-300">
										<svg
											className="w-3 h-3 mr-1"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
											/>
										</svg>
										Modified
									</div>
								</div>
							))}
						</div>
					</div>

					{/* Commit Message Section */}
					<div className="p-6">
						<label className="block text-sm font-medium text-earth-400 mb-3">
							Commit Message *
						</label>
						<textarea
							value={commitMessage}
							onChange={(e) => setCommitMessage(e.target.value)}
							placeholder="Describe your changes..."
							rows={4}
							className="w-full px-4 py-3 border border-earth-200 rounded-md focus:outline-none focus:ring-2 focus:ring-earth-400 focus:border-transparent text-earth-400 placeholder-earth-300 resize-none"
							disabled={isCommitting}
						/>
						<div className="flex justify-between items-center mt-2">
							<div className="text-xs text-earth-300">
								Tip: Use a clear, descriptive message that explains what you
								changed.
							</div>
							<div className="text-xs text-earth-300">
								{commitMessage.length}/100
							</div>
						</div>
					</div>
				</div>

				{/* Footer */}
				<div className="p-6 border-t border-earth-100 bg-earth-25">
					<div className="flex items-center justify-between">
						<div className="text-sm text-earth-300">
							{selectedFiles.size} of {unsavedFiles.length} files selected
						</div>

						<div className="flex space-x-3">
							<button
								onClick={onClose}
								disabled={isCommitting}
								className="px-4 py-2 text-sm text-earth-300 border border-earth-200 rounded-md hover:bg-earth-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								Cancel
							</button>

							<button
								onClick={handleCommit}
								disabled={
									!commitMessage.trim() ||
									selectedFiles.size === 0 ||
									isCommitting
								}
								className="px-6 py-2 text-sm bg-earth-400 text-white rounded-md hover:bg-earth-500 disabled:bg-earth-200 disabled:text-earth-300 disabled:cursor-not-allowed transition-colors flex items-center"
							>
								{isCommitting ? (
									<>
										<svg
											className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
										Committing...
									</>
								) : (
									<>
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
												d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
										Commit Changes
									</>
								)}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default CommitPanel;
