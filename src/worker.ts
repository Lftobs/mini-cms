import { createExports as astroCreateExports } from "@astrojs/cloudflare/entrypoints/server.js";
import { DurableObject } from "cloudflare:workers";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

const messageSync = 0;
const messageAwareness = 1;

export function createExports(manifest: unknown) {
    return { ...astroCreateExports(manifest as never), CollabRoom };
}

export class CollabRoom extends DurableObject<Cloudflare.Env> {
    private doc: Y.Doc | null = null;
    private awareness: awarenessProtocol.Awareness | null = null;
    private clients = new Set<WebSocket>();
    private persistTimer: ReturnType<typeof setTimeout> | null = null;

    private async getDoc(): Promise<Y.Doc> {
        if (this.doc) return this.doc;

        this.doc = new Y.Doc();
        const stored = await this.ctx.storage.get<Uint8Array | string>("doc");
        if (stored) {
            Y.applyUpdate(
                this.doc,
                typeof stored === "string" ? new Uint8Array(JSON.parse(stored)) : stored,
            );
        }
        this.doc.on("update", (update: Uint8Array, origin: unknown) => {
            this.broadcastUpdate(update, origin);
            this.schedulePersist();
        });
        return this.doc;
    }

    private getAwareness(doc: Y.Doc): awarenessProtocol.Awareness {
        if (this.awareness) return this.awareness;

        this.awareness = new awarenessProtocol.Awareness(doc);
        this.awareness.on(
            "update",
            ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }, _origin: unknown) => {
                const changedClients = [...added, ...updated, ...removed];
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, messageAwareness);
            encoding.writeVarUint8Array(
                encoder,
                awarenessProtocol.encodeAwarenessUpdate(this.awareness!, changedClients),
            );
            const buff = encoding.toUint8Array(encoder);
<<<<<<< HEAD
            for (const client of this.ctx.getWebSockets()) {
=======
            for (const client of this.clients) {
>>>>>>> origin/switch
                if (client.readyState === WebSocket.OPEN) client.send(buff);
            }
        });
        return this.awareness;
    }

    private schedulePersist(): void {
        if (this.persistTimer) return;
<<<<<<< HEAD
        this.persistTimer = setTimeout(async () => {
            this.persistTimer = null;
            if (this.doc) {
                await this.ctx.storage.put("doc", Y.encodeStateAsUpdate(this.doc));
=======
        this.persistTimer = setTimeout(() => {
            this.persistTimer = null;
            if (this.doc) {
                this.ctx.storage.put("doc", Y.encodeStateAsUpdate(this.doc));
>>>>>>> origin/switch
            }
        }, 1000);
    }

    private broadcastUpdate(update: Uint8Array, origin: unknown): void {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, messageSync);
        syncProtocol.writeUpdate(encoder, update);
        const buff = encoding.toUint8Array(encoder);
<<<<<<< HEAD
        for (const client of this.ctx.getWebSockets()) {
=======
        for (const client of this.clients) {
>>>>>>> origin/switch
            if (client !== origin && client.readyState === WebSocket.OPEN) {
                client.send(buff);
            }
        }
    }

    async fetch(request: Request): Promise<Response> {
        const upgrade = request.headers.get("Upgrade");
        if (!upgrade || upgrade.toLowerCase() !== "websocket") {
            return new Response("Expected a WebSocket connection", { status: 400 });
        }

        const pair = new WebSocketPair();
        const [client, server] = Object.values(pair);

        const doc = await this.getDoc();
        this.getAwareness(doc);

        this.clients.add(server);
        this.ctx.acceptWebSocket(server);

        return new Response(null, { status: 101, webSocket: client });
    }

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
<<<<<<< HEAD
        if (typeof message === "string") {
            ws.close(1003, "Unsupported text message");
            return;
        }

        const doc = await this.getDoc();
        const awareness = this.getAwareness(doc);

        try {
            const encoder = encoding.createEncoder();
            const decoder = decoding.createDecoder(new Uint8Array(message as ArrayBuffer));
            const messageType = decoding.readVarUint(decoder);
=======
        const doc = await this.getDoc();
        const awareness = this.getAwareness(doc);

        const encoder = encoding.createEncoder();
        const decoder = decoding.createDecoder(new Uint8Array(message as ArrayBuffer));
        const messageType = decoding.readVarUint(decoder);
>>>>>>> origin/switch

        switch (messageType) {
            case messageSync:
                encoding.writeVarUint(encoder, messageSync);
                syncProtocol.readSyncMessage(decoder, encoder, doc, ws);
                if (encoding.length(encoder) > 1) {
                    ws.send(encoding.toUint8Array(encoder));
                }
                break;
            case messageAwareness:
<<<<<<< HEAD
                const update = decoding.readVarUint8Array(decoder);
                // Extract client IDs from the awareness update to track them
                const clientIds = new Set(this.wsClientIds.get(ws) || []);
                const awarenessDecoder = decoding.createDecoder(update);
                const count = decoding.readVarUint(awarenessDecoder);
                for (let i = 0; i < count; i++) {
                    const clientId = decoding.readVarUint(awarenessDecoder);
                    clientIds.add(clientId);
                    // Skip rest of state block to get to the next ID
                    decoding.readVarUint(awarenessDecoder);
                    const stateLen = decoding.readVarUint(awarenessDecoder);
                    for (let j = 0; j < stateLen; j++) {
                        decoding.readUint8(awarenessDecoder);
                    }
                }
                this.wsClientIds.set(ws, Array.from(clientIds));

                awarenessProtocol.applyAwarenessUpdate(
                    awareness,
                    update,
=======
                awarenessProtocol.applyAwarenessUpdate(
                    awareness,
                    decoding.readVarUint8Array(decoder),
>>>>>>> origin/switch
                    ws,
                );
                break;
        }
<<<<<<< HEAD
        } catch (e) {
            console.error("Error parsing WebSocket message:", e);
            ws.close(1007, "Invalid payload");
        }
    }

    // Store awareness client IDs associated with each WebSocket
    private wsClientIds = new Map<WebSocket, number[]>();

    async webSocketClose(ws: WebSocket): Promise<void> {
        this.clients.delete(ws);
        if (this.awareness) {
            const clientIds = this.wsClientIds.get(ws) || [];
            if (clientIds.length > 0) {
                awarenessProtocol.removeAwarenessStates(
                    this.awareness,
                    clientIds,
                    null,
                );
            }
            this.wsClientIds.delete(ws);
=======
    }

    async webSocketClose(ws: WebSocket): Promise<void> {
        this.clients.delete(ws);
        if (this.awareness) {
            awarenessProtocol.removeAwarenessStates(
                this.awareness,
                [ws] as unknown as number[],
                null,
            );
>>>>>>> origin/switch
        }
    }

    async webSocketError(ws: WebSocket): Promise<void> {
        this.clients.delete(ws);
<<<<<<< HEAD
        if (this.awareness) {
            const clientIds = this.wsClientIds.get(ws) || [];
            if (clientIds.length > 0) {
                awarenessProtocol.removeAwarenessStates(
                    this.awareness,
                    clientIds,
                    null,
                );
            }
            this.wsClientIds.delete(ws);
        }
=======
>>>>>>> origin/switch
    }
}
