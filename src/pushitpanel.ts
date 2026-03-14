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

            <!-- SECCIÓN .GITIGNORE (NUEVA) -->
            <div class="section" style="padding: 0; overflow: hidden;" id="gitignore-section">
                <!-- Cabecera colapsable -->
                <div class="gitignore-header" id="gitignore-header" style="display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; background: #1e2130; cursor: pointer;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 14px; font-weight: 600; color: #a78bfa;">📁 .gitignore</span>
                        <span class="gitignore-count" id="gitignore-count" style="background: #6d28d9; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">0</span>
                    </div>
                    <span id="gitignore-toggle" style="color: #94a3b8; font-size: 16px;">▼</span>
                </div>
                
                <!-- Contenido colapsable -->
                <div id="gitignore-content" style="padding: 16px;">
                    <!-- Patrones rápidos -->
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px;">⚡ PATRONES RÁPIDOS</div>
                        <div class="patterns-grid" id="patterns-grid" style="display: flex; flex-wrap: wrap; gap: 6px;">
                            <span class="pattern-chip" data-pattern="node_modules/" style="background: #1e2130; border: 1px solid #2d3348; border-radius: 16px; padding: 4px 12px; font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #94a3b8; cursor: pointer;">node_modules/</span>
                            <span class="pattern-chip" data-pattern=".env" style="background: #1e2130; border: 1px solid #2d3348; border-radius: 16px; padding: 4px 12px; font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #94a3b8; cursor: pointer;">.env</span>
                            <span class="pattern-chip" data-pattern="dist/" style="background: #1e2130; border: 1px solid #2d3348; border-radius: 16px; padding: 4px 12px; font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #94a3b8; cursor: pointer;">dist/</span>
                            <span class="pattern-chip" data-pattern="*.log" style="background: #1e2130; border: 1px solid #2d3348; border-radius: 16px; padding: 4px 12px; font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #94a3b8; cursor: pointer;">*.log</span>
                            <span class="pattern-chip" data-pattern=".DS_Store" style="background: #1e2130; border: 1px solid #2d3348; border-radius: 16px; padding: 4px 12px; font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #94a3b8; cursor: pointer;">.DS_Store</span>
                            <span class="pattern-chip" data-pattern="coverage/" style="background: #1e2130; border: 1px solid #2d3348; border-radius: 16px; padding: 4px 12px; font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #94a3b8; cursor: pointer;">coverage/</span>
                            <span class="pattern-chip" data-pattern="build/" style="background: #1e2130; border: 1px solid #2d3348; border-radius: 16px; padding: 4px 12px; font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #94a3b8; cursor: pointer;">build/</span>
                            <span class="pattern-chip" data-pattern=".vscode/" style="background: #1e2130; border: 1px solid #2d3348; border-radius: 16px; padding: 4px 12px; font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #94a3b8; cursor: pointer;">.vscode/</span>
                        </div>
                    </div>
                                    
                    <!-- Patrón personalizado -->
                    <div style="display: flex; gap: 8px; margin-bottom: 20px;">
                        <input type="text" id="custom-pattern" placeholder="ej: *.temp, /build, !importante.js" style="flex: 1; background: #1e2130; border: 1px solid #2d3348; border-radius: 6px; color: white; padding: 8px 12px; font-size: 12px;">
                        <button id="add-pattern-btn" style="background: #6d28d9; border: none; border-radius: 6px; color: white; padding: 8px 16px; font-size: 12px; cursor: pointer;">Añadir</button>
                    </div>
                    
                    <!-- Lista de patrones ignorados -->
                    <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px;">📋 PATRONES IGNORADOS</div>
                    <div id="ignored-list" style="background: #1e2130; border: 1px solid #2d3348; border-radius: 6px; max-height: 150px; overflow-y: auto;">
                        <div class="empty-message" style="padding: 12px; text-align: center; color: #64748b;">No hay patrones ignorados</div>
                    </div>
                </div>
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
                    
                    // Variables para .gitignore (NUEVO)
                    let ignoredPatterns = [];
                    let isGitIgnoreCollapsed = false;

                    // Elementos del DOM para gitignore (NUEVO)
                    const gitignoreHeader = document.getElementById('gitignore-header');
                    const gitignoreContent = document.getElementById('gitignore-content');
                    const gitignoreToggle = document.getElementById('gitignore-toggle');
                    const gitignoreCount = document.getElementById('gitignore-count');
                    const patternsGrid = document.getElementById('patterns-grid');
                    const customPattern = document.getElementById('custom-pattern');
                    const addPatternBtn = document.getElementById('add-pattern-btn');
                    const ignoredList = document.getElementById('ignored-list');

                    // Función para guardar estado colapsado (NUEVO)
                    function saveCollapsedState(collapsed) {
                        try {
                            localStorage.setItem('pushit-gitignore-collapsed', collapsed.toString());
                        } catch (e) {
                            // Ignorar errores de localStorage
                        }
                    }

                    // Función para cargar estado colapsado (NUEVO)
                    function loadCollapsedState() {
                        try {
                            const saved = localStorage.getItem('pushit-gitignore-collapsed');
                            return saved === 'true';
                        } catch (e) {
                            return false;
                        }
                    }

                    // Colapsar/expandir (NUEVO)
                    if (gitignoreHeader && gitignoreContent && gitignoreToggle) {
                        // Cargar estado guardado
                        isGitIgnoreCollapsed = loadCollapsedState();
                        if (isGitIgnoreCollapsed) {
                            gitignoreContent.style.display = 'none';
                            gitignoreToggle.textContent = '▶';
                        }
                        
                        gitignoreHeader.addEventListener('click', () => {
                            const isHidden = gitignoreContent.style.display === 'none';
                            gitignoreContent.style.display = isHidden ? 'block' : 'none';
                            gitignoreToggle.textContent = isHidden ? '▼' : '▶';
                            saveCollapsedState(!isHidden);
                        });
                    }

                    // Actualizar lista de patrones ignorados (NUEVO)
                    function updateIgnoredList(patterns) {
                        if (!ignoredList) return;
                        
                        if (patterns.length > 0) {
                            let html = '';
                            patterns.forEach(pattern => {
                                html += '<div class="ignored-item">' +
                                    '<span>' + pattern + '</span>' +
                                    '<span class="remove-btn" data-pattern="' + pattern + '">✕</span>' +
                                    '</div>';
                            });
                            ignoredList.innerHTML = html;
                            
                            // Añadir eventos a los botones de eliminar
                            document.querySelectorAll('.ignored-item .remove-btn').forEach(btn => {
                                btn.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    const pattern = e.target.dataset.pattern;
                                    if (pattern) {
                                        vscode.postMessage({ command: 'removeGitIgnore', pattern });
                                    }
                                });
                            });
                        } else {
                            ignoredList.innerHTML = '<div class="empty-message" style="padding: 12px; text-align: center; color: #64748b;">No hay patrones ignorados</div>';
                        }
                        
                        if (gitignoreCount) {
                            gitignoreCount.textContent = patterns.length.toString();
                        }
                    }

                    // Seleccionar patrones rápidos (NUEVO)
                    if (patternsGrid) {
                        patternsGrid.addEventListener('click', (e) => {
                            const target = e.target;
                            if (target.classList.contains('pattern-chip')) {
                                target.classList.toggle('selected');
                                const pattern = target.dataset.pattern;
                                if (pattern) {
                                    if (target.classList.contains('selected')) {
                                        vscode.postMessage({ command: 'addGitIgnore', pattern });
                                    } else {
                                        vscode.postMessage({ command: 'removeGitIgnore', pattern });
                                    }
                                }
                            }
                        });
                    }
                    // Añadir patrón personalizado (NUEVO)
                    if (addPatternBtn && customPattern) {
                        addPatternBtn.addEventListener('click', () => {
                            const pattern = customPattern.value.trim();
                            if (pattern) {
                                vscode.postMessage({ command: 'addGitIgnore', pattern });
                                customPattern.value = '';
                            }
                        });
                        
                        customPattern.addEventListener('keypress', (e) => {
                            if (e.key === 'Enter') {
                                const pattern = customPattern.value.trim();
                                if (pattern) {
                                    vscode.postMessage({ command: 'addGitIgnore', pattern });
                                    customPattern.value = '';
                                }
                            }
                        });
                    }
                    
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

                            // NUEVO: Caso para recibir contenido de .gitignore
                            case 'gitIgnoreContent':
                                if (msg.patterns) {
                                    ignoredPatterns = msg.patterns;
                                    updateIgnoredList(msg.patterns);
                                    
                                    // Marcar chips seleccionados
                                    document.querySelectorAll('.pattern-chip').forEach(chip => {
                                        const pattern = chip.getAttribute('data-pattern');
                                        if (pattern && msg.patterns.includes(pattern)) {
                                            chip.classList.add('selected');
                                        } else {
                                            chip.classList.remove('selected');
                                        }
                                    });
                                }
                                break;
                        }
                    });
                    
                    // Inicializar
                    vscode.postMessage({ command: 'checkRemote' });
                    // NUEVO: Solicitar contenido de .gitignore al iniciar
                    vscode.postMessage({ command: 'getGitIgnore' });
                })();
            </script>
        </body>
        </html>`;
    }
}