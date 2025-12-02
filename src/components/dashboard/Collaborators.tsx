import React, { useState, useEffect } from "react";

interface Member {
    id: string;
    userId: string;
    username: string;
    email: string;
    pfp: string;
    role: string;
    joinedAt: string;
}

interface Invite {
    id: string;
    email: string;
    role: string;
    status: string;
    expiresAt: string;
}

interface CollaboratorsProps {
    projectId: string;
}

export default function Collaborators({ projectId }: CollaboratorsProps) {
    const [members, setMembers] = useState<Member[]>([]);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(true);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteLoading, setInviteLoading] = useState(false);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        fetchMembers();
    }, [projectId]);

    const fetchMembers = async () => {
        try {
            const response = await fetch(`/api/projects/${projectId}/members`);
            const data = await response.json();
            if (response.ok) {
                setMembers(data.data.members);
                setInvites(data.data.pendingInvites);
            }
        } catch (error) {
            console.error("Error fetching members:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setInviteLoading(true);
        setMessage(null);

        try {
            const response = await fetch(`/api/projects/${projectId}/invite`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email: inviteEmail, role: "editor" }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage({ type: "success", text: "Invitation sent successfully!" });
                setInviteEmail("");
                fetchMembers();
                // In a real app, the link would be emailed. For demo/dev, we might want to show it.
            } else {
                setMessage({ type: "error", text: data.error || "Failed to send invitation" });
            }
        } catch (error) {
            setMessage({ type: "error", text: "An error occurred" });
        } finally {
            setInviteLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Invite Section */}
            <div className="bg-white p-6 rounded-lg border border-[#E6E4E1]">
                <h3 className="text-lg font-medium text-[#37322F] mb-4">Invite Collaborators</h3>
                <form onSubmit={handleInvite} className="flex gap-4 items-end">
                    <div className="flex-1">
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={inviteEmail}
                            onChange={(e) => setInviteEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-[#37322F]"
                            placeholder="colleague@example.com"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={inviteLoading}
                        className="px-4 py-2 bg-[#37322F] text-white rounded-md hover:bg-[#2A2520] disabled:opacity-50 transition-colors"
                    >
                        {inviteLoading ? "Sending..." : "Invite"}
                    </button>
                </form>
                {message && (
                    <div className={`mt-4 p-3 rounded-md text-sm ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                        {message.text}
                    </div>
                )}
            </div>

            {/* Members List */}
            <div className="bg-white rounded-lg border border-[#E6E4E1] overflow-hidden">
                <div className="px-6 py-4 border-b border-[#E6E4E1]">
                    <h3 className="text-lg font-medium text-[#37322F]">Team Members</h3>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <svg className="animate-spin h-8 w-8 text-[#37322F]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    </div>
                ) : (
                    <ul className="divide-y divide-[#E6E4E1]">
                        {members.map((member) => (
                            <li key={member.id} className="px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    {member.pfp ? (
                                        <img src={member.pfp} alt={member.username} className="w-10 h-10 rounded-full" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-medium">
                                            {member.username.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-[#37322F]">{member.username}</p>
                                        <p className="text-xs text-gray-500">{member.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full capitalize">
                                        {member.role}
                                    </span>
                                </div>
                            </li>
                        ))}
                        {members.length === 0 && (
                            <li className="px-6 py-8 text-center text-gray-500 text-sm">
                                No members yet. Invite someone to collaborate!
                            </li>
                        )}
                    </ul>
                )}
            </div>

            {/* Pending Invites */}
            {!loading && invites.length > 0 && (
                <div className="bg-white rounded-lg border border-[#E6E4E1] overflow-hidden">
                    <div className="px-6 py-4 border-b border-[#E6E4E1]">
                        <h3 className="text-lg font-medium text-[#37322F]">Pending Invitations</h3>
                    </div>
                    <ul className="divide-y divide-[#E6E4E1]">
                        {invites.map((invite) => (
                            <li key={invite.id} className="px-6 py-4 flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-[#37322F]">{invite.email}</p>
                                    <p className="text-xs text-gray-500">Expires: {new Date(invite.expiresAt).toLocaleDateString()}</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full capitalize">
                                        {invite.status}
                                    </span>
                                    <span className="text-xs text-gray-500 capitalize">{invite.role}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
