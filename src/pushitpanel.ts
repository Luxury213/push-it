import * as vscode from 'vscode';

export class PushItPanel implements vscode.WebviewViewProvider {
    
    constructor(private readonly context: vscode.ExtensionContext) {}

    resolveWebviewView(webviewView: vscode.WebviewView) {
        webviewView.webview.options = {
            enableScripts: true
        };

        webviewView.webview.html = this._getHtml(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(
            async (message) => {
                await vscode.commands.executeCommand('push-it.handleMessage', message);
            },
            undefined,
            this.context.subscriptions
        );

        vscode.commands.registerCommand('push-it.sendToPanel', (message) => {
            webviewView.webview.postMessage(message);
        });
    }

    private _getHtml(webview: vscode.Webview): string {
        const styleUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, 'media', 'styles.css')
        );

        return `<!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
            <link rel="stylesheet" href="${styleUri}">
        </head>
        <body>
            <!-- Header con botón Init -->
            <div class="header">
                <h1>Push It</h1>
                <button class="btn-icon" id="git-init-btn">📁 Init</button>
            </div>

            <!-- Info card -->
            <div class="info-card">
                <div class="info-row">
                    <span class="info-label">Rama</span>
                    <span class="info-value" id="branch-name">—</span>
                </div>
                <div class="info-row" id="remote-row" style="display: none;">
                    <span class="info-label">Remote</span>
                    <span class="info-value" id="remote-name">origin</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Cambios</span>
                    <span class="info-value" id="changes-count">0</span>
                </div>
            </div>

            <!-- Remote URL -->
            <div class="remote-url" id="remote-url-display" style="display: none;">
                <span id="remote-url-text"></span>
            </div>

            <!-- Commit section -->
            <div class="section">
                <div class="section-header">
                    <h2>Nuevo commit</h2>
                </div>
                
                <textarea 
                    id="commit-message" 
                    rows="2" 
                    placeholder="Mensaje del commit..."
                ></textarea>
                
                <button class="btn-primary" id="commit-btn">
                    Confirmar commit
                </button>
                
                <div id="commit-status" class="status-message"></div>
            </div>

            <!-- Sync section -->
            <div class="section">
                <div class="section-header">
                    <h2>Sincronización</h2>
                </div>
                
                <div class="button-row">
                    <button class="btn-primary" id="push-btn">Push</button>
                    <button class="" id="pull-btn">Pull</button>
                </div>
                
                <div id="sync-status" class="status-message"></div>
            </div>

            <!-- Changes list -->
            <div class="section">
                <div class="section-header">
                    <h2>Cambios pendientes</h2>
                </div>
                
                <div class="changes-list" id="changes-list">
                    <div class="empty-message">
                        No hay cambios pendientes
                    </div>
                </div>
            </div>

            <!-- Remote setup (hidden) -->
            <div class="section" id="remote-setup" style="display: none;">
                <div class="section-header">
                    <h2>Conectar remote</h2>
                </div>
                
                <p class="empty-message">No hay repositorio remoto configurado</p>
                
                <input 
                    type="text" 
                    id="remote-input" 
                    placeholder="https://github.com/usuario/repo.git"
                >
                
                <button class="btn-primary" id="add-remote-btn">
                    Conectar
                </button>
            </div>

            <!-- Footer -->
            <div class="footer">
                Push It · v0.2.0
            </div>

            <script>
                (function() {
                    const vscode = acquireVsCodeApi();
                    
                    const elements = {
                        gitInitBtn: document.getElementById('git-init-btn'),
                        commitBtn: document.getElementById('commit-btn'),
                        pushBtn: document.getElementById('push-btn'),
                        pullBtn: document.getElementById('pull-btn'),
                        addRemoteBtn: document.getElementById('add-remote-btn'),
                        commitMessage: document.getElementById('commit-message'),
                        commitStatus: document.getElementById('commit-status'),
                        syncStatus: document.getElementById('sync-status'),
                        remoteInput: document.getElementById('remote-input'),
                        remoteRow: document.getElementById('remote-row'),
                        remoteName: document.getElementById('remote-name'),
                        remoteUrlDisplay: document.getElementById('remote-url-display'),
                        remoteUrlText: document.getElementById('remote-url-text'),
                        remoteSetup: document.getElementById('remote-setup'),
                        branchName: document.getElementById('branch-name'),
                        changesList: document.getElementById('changes-list'),
                        changesCount: document.getElementById('changes-count')
                    };
                    
                    function showStatus(element, message, type) {
                        element.textContent = message;
                        element.className = 'status-message ' + type;
                        
                        setTimeout(() => {
                            element.textContent = '';
                            element.className = 'status-message';
                        }, 3000);
                    }
                    
                    // Git Init button
                    if (elements.gitInitBtn) {
                        elements.gitInitBtn.addEventListener('click', () => {
                            vscode.postMessage({ command: 'gitInit' });
                        });
                    }
                    
                    // Commit
                    if (elements.commitBtn) {
                        elements.commitBtn.addEventListener('click', () => {
                            const msg = elements.commitMessage.value.trim();
                            if (!msg) {
                                showStatus(elements.commitStatus, 'El mensaje es obligatorio', 'error');
                                return;
                            }
                            showStatus(elements.commitStatus, 'Procesando...', 'info');
                            vscode.postMessage({ command: 'commit', message: msg });
                        });
                    }
                    
                    // Push
                    if (elements.pushBtn) {
                        elements.pushBtn.addEventListener('click', () => {
                            showStatus(elements.syncStatus, 'Subiendo...', 'info');
                            vscode.postMessage({ command: 'push' });
                        });
                    }
                    
                    // Pull
                    if (elements.pullBtn) {
                        elements.pullBtn.addEventListener('click', () => {
                            showStatus(elements.syncStatus, 'Descargando...', 'info');
                            vscode.postMessage({ command: 'pull' });
                        });
                    }
                    
                    // Add remote
                    if (elements.addRemoteBtn) {
                        elements.addRemoteBtn.addEventListener('click', () => {
                            const url = elements.remoteInput.value.trim();
                            if (!url) {
                                showStatus(elements.syncStatus, 'URL requerida', 'error');
                                return;
                            }
                            showStatus(elements.syncStatus, 'Configurando...', 'info');
                            vscode.postMessage({ command: 'addRemote', url: url });
                        });
                    }
                    
                    window.addEventListener('message', (event) => {
                        const msg = event.data;
                        
                        switch (msg.command) {
                            case 'commitResult':
                                if (msg.success) {
                                    showStatus(elements.commitStatus, 'Commit realizado', 'success');
                                    elements.commitMessage.value = '';
                                } else {
                                    showStatus(elements.commitStatus, 'Error: ' + (msg.error || ''), 'error');
                                }
                                break;
                                
                            case 'pushResult':
                            case 'pullResult':
                                if (msg.success) {
                                    showStatus(elements.syncStatus, 'Completado', 'success');
                                } else if (msg.error === 'no-remote') {
                                    showStatus(elements.syncStatus, 'Configurar remote', 'warning');
                                    if (elements.remoteSetup) elements.remoteSetup.style.display = 'block';
                                } else {
                                    showStatus(elements.syncStatus, 'Error: ' + (msg.error || ''), 'error');
                                }
                                break;
                                
                            case 'remoteStatus':
                                if (msg.hasRemote && msg.remotes?.length > 0) {
                                    if (elements.remoteRow) elements.remoteRow.style.display = 'flex';
                                    if (elements.remoteSetup) elements.remoteSetup.style.display = 'none';
                                    if (elements.remoteName) elements.remoteName.textContent = msg.remotes[0].name;
                                    if (elements.remoteUrlDisplay) {
                                        elements.remoteUrlDisplay.style.display = 'block';
                                        elements.remoteUrlText.textContent = msg.remotes[0].url;
                                    }
                                } else {
                                    if (elements.remoteRow) elements.remoteRow.style.display = 'none';
                                    if (elements.remoteSetup) elements.remoteSetup.style.display = 'block';
                                    if (elements.remoteUrlDisplay) elements.remoteUrlDisplay.style.display = 'none';
                                }
                                break;
                                
                            case 'remoteResult':
                                if (msg.success) {
                                    showStatus(elements.syncStatus, 'Conectado', 'success');
                                    elements.remoteInput.value = '';
                                } else {
                                    showStatus(elements.syncStatus, 'Error: ' + (msg.error || ''), 'error');
                                }
                                break;
                                
                            case 'updateBranch':
                                if (elements.branchName) {
                                    elements.branchName.textContent = msg.branch || '—';
                                }
                                break;
                                
                            case 'updateChanges':
                                if (!elements.changesList) break;
                                
                                if (msg.changes?.length > 0) {
                                    let html = '';
                                    for (const change of msg.changes) {
                                        let icon = '📄';
                                        if (change.status.includes('M')) icon = '✏️';
                                        else if (change.status.includes('A')) icon = '➕';
                                        else if (change.status.includes('D')) icon = '🗑️';
                                        else if (change.status.includes('?')) icon = '❓';
                                        
                                        html += '<div class="change-item">' +
                                            '<span>' + icon + '</span>' +
                                            '<span class="change-file">' + change.file + '</span>' +
                                            '</div>';
                                    }
                                    elements.changesList.innerHTML = html;
                                    if (elements.changesCount) elements.changesCount.textContent = msg.changes.length;
                                } else {
                                    elements.changesList.innerHTML = '<div class="empty-message">No hay cambios pendientes</div>';
                                    if (elements.changesCount) elements.changesCount.textContent = '0';
                                }
                                break;

                            case 'notGitRepo':
                                if (elements.branchName) elements.branchName.textContent = '—';
                                if (elements.changesCount) elements.changesCount.textContent = '0';
                                if (elements.changesList) {
                                    elements.changesList.innerHTML = '<div class="empty-message">No es un repositorio Git. Usa "Init" para comenzar.</div>';
                                }
                                break;

                            case 'initResult':
                                if (msg.success) {
                                    showStatus(elements.syncStatus, 'Repositorio inicializado', 'success');
                                } else if (msg.error) {
                                    showStatus(elements.syncStatus, 'Error: ' + msg.error, 'error');
                                }
                                break;
                        }
                    });
                    
                    vscode.postMessage({ command: 'checkRemote' });
                })();
            </script>
        </body>
        </html>`;
    }
}