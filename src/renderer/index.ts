import * as ftp from 'basic-ftp';
import { ipcRenderer } from 'electron';
import { statSync } from 'fs';
import { basename } from 'path';
import './styles.css';
import Icon from './text-file-icon-5923.svg';

class DropArea {
    constructor(private htmlElement: HTMLElement) {
        htmlElement.ondragleave = e => this.onDragLeave(e);
        htmlElement.ondragover = e => this.onDragOver(e);
        htmlElement.ondrop = e => this.onDrop(e);
    }

    show() {
        this.htmlElement.style.display = "flex";
    }

    hide() {
        this.htmlElement.style.display = "none";
    }

    private onDragLeave(event: Event): void {
        event.stopPropagation();
        event.preventDefault();
        this.hide();
    }

    private onDragOver(event: DragEvent): void {
        event.stopPropagation();
        event.preventDefault();
    }

    private async onDrop(event: DragEvent): Promise<void> {
        event.stopPropagation();
        event.preventDefault();

        const filePath = event.dataTransfer!.files[0].path;
        console.log(filePath);
        const fileSize = statSync(filePath).size;
        this.hide();
        const client = await connectToServer();
        client.trackProgress(info => {
            console.log(info.bytes / fileSize);
            ipcRenderer.send("upload-progress", info.bytes / fileSize)
        })
        await client.uploadFrom(filePath, basename(filePath));
        client.close();
        ipcRenderer.send("upload-progress", -1);
        showFTPDirList()
    }
}

async function connectToServer(): Promise<ftp.Client> {
    const client = new ftp.Client();
    await client.access({
        host: (document.getElementById("host") as HTMLInputElement).value,
        port: parseInt((document.getElementById("port") as HTMLInputElement).value),
        secure: false
    })
    return client
}

const fileTemplate = document.createElement('template');
fileTemplate.innerHTML = `<div class="fileitem">
<img src="${Icon}" style="width:50px" ondragstart="return false;"/>
<div class="filename"></div>
</div>`;

async function showFTPDirList(): Promise<void> {
    let client;
    //client.ftp.verbose = true;
    let files: ftp.FileInfo[] = [];
    try {
        client = await connectToServer()
        files = await client.list();
        client.close()
    }
    catch (err) {
        console.log(err)
    }
    console.log(files);

    const dirContents = document.getElementById("dircontents")!;
    dirContents.innerHTML = '';
    for (const file of files.filter(f => f.isFile)) {
        const newfile = fileTemplate.content.cloneNode(true);
        ((newfile as HTMLElement).querySelector(".filename") as HTMLElement).innerHTML = file.name;
        dirContents.appendChild(newfile)
    }
}

document.getElementById("connect-button")!.onclick = showFTPDirList;

const fileDropper = new DropArea(document.getElementById("dropper")!);

window.addEventListener('dragenter', function (e) {
    fileDropper.show();
});