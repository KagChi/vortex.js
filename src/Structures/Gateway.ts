import WebSocket from "ws";

export class Gateway {
    public baseWebsocketURL = "wss://vortex.revolt.chat/";
    public connection: WebSocket | undefined;
    
    public rtpCapabilities = {
        codecs: new Map(),
        headerExtensions: new Map(),
    }

    public initializeTransports = {
        recvTransport: new Map(),
        sendTransport: new Map(),
    }

    private videoAllowed = false;

    public constructor(public authorization: string, public roomId: string) {}

    public connect() {
        this.connection = new WebSocket(this.baseWebsocketURL);
        this.connection.once("open", () => this.sendAuthentication());
        this.connection.on("message", (data: string) => this.onMessage(data));
    }

    public sendAuthentication() {
        this.send({
            data: {
                roomId: this.roomId, token: this.authorization
            },
            id: 0, type: "Authenticate"
        });
    }

    public sendRoomInfo() {
        this.send({
            id: 0, type: "RoomInfo"
        })
    }

    public sendInitializeTransports(mode: string) {
        this.send({
            data: {
                mode, rtpCapabilities: {
                    codecs: [...this.rtpCapabilities.codecs.values()],
                    headerExtensions: [...this.rtpCapabilities.headerExtensions.values()]
                }
            },
            id: 2, type: "InitializeTransports"
        })
    }

    public onMessage(data: string) {
        const message = JSON.parse(data);
        switch (message.type) {
            case "Authenticate": {
                for (const codec of message.data.rtpCapabilities.codecs) {
                    this.rtpCapabilities.codecs.set(codec.mimeType, codec);
                }
                for (const header of message.data.rtpCapabilities.headerExtensions) {
                    this.rtpCapabilities.headerExtensions.set(header.preferredId, header);
                }
                this.sendRoomInfo();
                break;
            }
            case "RoomInfo": {
                this.videoAllowed = message.data.videoAllowed;
                break;
            }
            case "InitializeTransports": {
                this.initializeTransports.sendTransport.set(message.data.sendTransport.id, message.data.sendTransport);
                this.initializeTransports.recvTransport.set(message.data.recvTransport.id, message.data.recvTransport);
                break;
            }
            default: {
                console.log("Unknown message type", message.type);
            }
        }
    }

    public get connected() {
        return this.connection !== undefined && this.connection.readyState === WebSocket.OPEN;
    }

    public send<T>(message: T) {
        if (this.connected && this.connection) {
            return this.connection.send(JSON.stringify(message));
        }
        throw new Error("Not connected to the gateway");
    }
}