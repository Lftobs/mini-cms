import React, { useCallback, useEffect, useRef, useState } from "react";
import api from "@/lib/clients";
import {
	optimizeImage,
	blobToBase64,
	generateImageFilename,
	isImageFile,
	formatFileSize,
	getOptimalFormat,
} from "@/utils/imageOptimization";

interface MediaFile {
	name: string;
	path: string;
	size: number;
	sha: string;
	rawUrl: string;
	githubUrl: string;
}

interface MediaManagerProps {
	projectId: string;
	repoOwner: string;
	repoName: string;
	mediaPath?: string;
	onImageSelect?: (imageUrl: string) => void;
}

const MediaManager: React.FC<MediaManagerProps> = ({
	projectId,
	repoOwner,
	repoName,
	mediaPath,
	onImageSelect,
}) => {
	const [files, setFiles] = useState<MediaFile[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [uploading, setUploading] = useState(false);
	const [uploadProgress, setUploadProgress] = useState(0);
	const [selectedImage, setSelectedImage] = useState<MediaFile | null>(null);
	const [currentMediaPath, setCurrentMediaPath] = useState<string | undefined>(
		mediaPath
	);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Fetch media files from the media path
	const fetchMediaFiles = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const query = currentMediaPath ? `?path=${encodeURIComponent(currentMediaPath)}` : "";
			const response = await (api.projects as any)[projectId].repo[
				repoOwner
			][repoName].media.$get({ query });

			if (!response.ok) {
				throw new Error(`Failed to load media: ${response.statusText}`);
			}

			const data = await response.json();
			setFiles(data.data.files || []);
			if (data.data.path) {
				setCurrentMediaPath(data.data.path);
			}
		} catch (err) {
			console.error("Error loading media:", err);
			setError(err instanceof Error ? err.message : "Failed to load media files");
		} finally {
			setIsLoading(false);
		}
	}, [projectId, repoOwner, repoName, currentMediaPath]);

	useEffect(() => {
		fetchMediaFiles();
	}, [fetchMediaFiles]);

	// Drag and drop handlers
	const handleDragEnter = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
		setIsDragging(false);
	}, []);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		e.stopPropagation();
	}, []);

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			e.stopPropagation();
			setIsDragging(false);

			const droppedFiles = Array.from(e.dataTransfer.files).filter(isImageFile);
			if (droppedFiles.length > 0) {
				await uploadFiles(droppedFiles);
			}
		},
		[projectId, repoOwner, repoName, currentMediaPath]
	);

	// File upload handler
	const uploadFiles = async (filesToUpload: File[]) => {
		if (!currentMediaPath) {
			setError("No media path configured");
			return;
		}

		setUploading(true);
		setUploadProgress(0);

		try {
			const totalFiles = filesToUpload.length;
			const uploadedFiles = [];

			for (let i = 0; i < filesToUpload.length; i++) {
				const file = filesToUpload[i];

				// Optimize image
				const format = getOptimalFormat(file);
				const optimized = await optimizeImage(file, {
					maxWidth: 1920,
					maxHeight: 1080,
					quality: 0.85,
					format,
				});

				// Convert to base64
				const base64Content = await blobToBase64(optimized);

				// Generate filename
				const filename = generateImageFilename(file.name);

				uploadedFiles.push({
					filename,
					content: base64Content,
				});

				setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
			}

			// Upload to server
			const response = await (api.projects as any)[projectId].repo[
				repoOwner
			][repoName]["media/upload"].$post({
				json: {
					files: uploadedFiles,
					mediaPath: currentMediaPath,
				},
			});

			if (!response.ok) {
				throw new Error(`Upload failed: ${response.statusText}`);
			}

			// Refresh file list
			await fetchMediaFiles();
		} catch (err) {
			console.error("Upload error:", err);
			setError(err instanceof Error ? err.message : "Upload failed");
		} finally {
			setUploading(false);
			setUploadProgress(0);
		}
	};

	// Handle file input change
	const handleFileInputChange = async (
		e: React.ChangeEvent<HTMLInputElement>
	) => {
		const selectedFiles = Array.from(e.target.files || []).filter(isImageFile);
		if (selectedFiles.length > 0) {
			await uploadFiles(selectedFiles);
		}
		// Reset input
		e.target.value = "";
	};

	// Handle toolbar button click
	const handleToolbarClick = () => {
		fileInputRef.current?.click();
	};

	// Handle image click
	const handleImageClick = (file: MediaFile) => {
		setSelectedImage(file);
		if (onImageSelect) {
			onImageSelect(file.rawUrl);
		}
	};

	// Copy image URL to clipboard
	const copyImageUrl = (url: string) => {
		navigator.clipboard.writeText(url);
	};

	if (isLoading) {
		return (
			<div className="flex items-center justify-center h-full text-earth-300">
				Loading media...
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex flex-col items-center justify-center h-full text-red-500 p-4">
				<p>{error}</p>
				<button
					onClick={fetchMediaFiles}
					className="mt-2 text-sm text-earth-400 hover:text-earth-500"
				>
					Try again
				</button>
			</div>
		);
	}

	return (
		<div
			className="flex flex-col h-full bg-earth-50 border-l border-earth-200"
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onDragOver={handleDragOver}
			onDrop={handleDrop}
		>
			{/* Header */}
			<div className="flex items-center justify-between p-3 border-b border-earth-200 bg-white">
				<h3 className="font-semibold text-earth-400">Media Library</h3>
				<div className="flex items-center space-x-2">
					<span className="text-xs text-earth-300">{files.length} images</span>
					<button
						onClick={handleToolbarClick}
						className="p-1.5 bg-earth-400 text-white rounded hover:bg-earth-500 transition-colors"
						title="Upload images"
					>
						<svg
							className="w-4 h-4"
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
				</div>
			</div>

			{/* Upload Progress */}
			{uploading && (
				<div className="px-3 py-2 bg-blue-50 border-b border-blue-100"
				>
					<div className="flex items-center justify-between text-xs text-blue-700 mb-1">
						<span>Uploading...</span>
						<span>{uploadProgress}%</span>
					</div>
					<div className="w-full bg-blue-200 rounded-full h-1.5">
						<div
							className="bg-blue-500 h-1.5 rounded-full transition-all"
							style={{ width: `${uploadProgress}%` }}
						/>
					</div>
				</div>
			)}

			{/* Drag Overlay */}
			{isDragging && (
				<div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-400 z-10 flex items-center justify-center">
					<div className="text-center">
						<svg
							className="w-12 h-12 text-blue-500 mx-auto mb-2"
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
						<p className="text-blue-600 font-medium">Drop images here</p>
					</div>
				</div>
			)}

			{/* File Grid */}
			<div className="flex-1 overflow-y-auto p-3"
			>
				{files.length === 0 ? (
					<div className="text-center py-8 text-earth-300"
					>
						<svg
							className="w-12 h-12 mx-auto mb-3 text-earth-200"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={1.5}
								d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
							/>
						</svg>
						<p>No images yet</p>
						<p className="text-xs mt-1">
							Drag and drop images here or click the + button
						</p>
					</div>
				) : (
					<div className="grid grid-cols-2 gap-2">
						{files.map((file) => (
							<div
								key={file.sha}
								className={`group relative aspect-square bg-white rounded-lg border-2 overflow-hidden cursor-pointer transition-all ${
									selectedImage?.sha === file.sha
										? "border-earth-400 ring-2 ring-earth-400/20"
										: "border-earth-200 hover:border-earth-300"
								}`}
								onClick={() => handleImageClick(file)}
							>
								<img
									src={file.rawUrl}
									alt={file.name}
									className="w-full h-full object-cover"
									loading="lazy"
								/>

								{/* Hover Overlay */}
								<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
									<button
										onClick={(e) => {
											e.stopPropagation();
											copyImageUrl(file.rawUrl);
										}}
										className="p-2 bg-white rounded-full text-earth-400 hover:text-earth-500"
										title="Copy URL"
									>
										<svg
											className="w-4 h-4"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
											/>
										</svg>
									</button>
									</div>

									{/* Filename on hover */}
									<div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
										<p className="text-white text-xs truncate">{file.name}</p>
										<p className="text-white/70 text-[10px]">
											{formatFileSize(file.size)}
										</p>
									</div>
								</div>
						))}
					</div>
				)}
			</div>

			{/* Hidden File Input */}
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				multiple
				onChange={handleFileInputChange}
				className="hidden"
			/>
		</div>
	);
};

export default MediaManager;
