import * as vscode from 'vscode';
import { PushItPanel } from './pushitpanel';
import { exec } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

export function activate(context: vscode.ExtensionContext) {
    console.log('¡Push It activado!');

    const provider = new PushItPanel(context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('push-it.panel', provider)
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('push-it.handleMessage', async (message) => {
            const workspaceFolder = getWorkspaceFolder();
            
            // Caso especial: git init no necesita workspaceFolder existente
            if (message.command === 'gitInit') {
                if (!workspaceFolder) {
                    vscode.window.showErrorMessage('Abre una carpeta primero');
                    vscode.commands.executeCommand('push-it.sendToPanel', {
                        command: 'initResult',
                        success: false,
                        error: 'No hay carpeta abierta'
                    });
                    return;
                }
                await gitInit(workspaceFolder);
                return;
            }
            
            if (!workspaceFolder) {
                vscode.window.showErrorMessage('Abre una carpeta o proyecto primero');
                return;
            }

            switch (message.command) {
                case 'commit':
                    await gitCommit(workspaceFolder, message.message);
                    break;
                case 'push':
                    await gitPush(workspaceFolder);
                    break;
                case 'pull':
                    await gitPull(workspaceFolder);
                    break;
                case 'checkRemote':
                    await checkRemote(workspaceFolder);
                    break;
                case 'addRemote':
                    await addRemote(workspaceFolder, message.url);
                    break;
                // NUEVOS COMANDOS PARA .GITIGNORE
                case 'getGitIgnore':
                    await getGitIgnoreContent(workspaceFolder);
                    break;
                case 'addGitIgnore':
                    await addToGitIgnore(workspaceFolder, message.pattern);
                    break;
                case 'removeGitIgnore':
                    await removeFromGitIgnore(workspaceFolder, message.pattern);
                    break;
            }
        })
    );

    function getWorkspaceFolder(): string | undefined {
        const folders = vscode.workspace.workspaceFolders;
        return folders ? folders[0].uri.fsPath : undefined;
    }

    // Verificar si es un repositorio Git
    async function checkIsGitRepo(folder: string): Promise<boolean> {
        return new Promise((resolve) => {
            if (!folder) {
                resolve(false);
                return;
            }
            const gitPath = path.join(folder, '.git');
            fs.access(gitPath, fs.constants.F_OK, (err) => {
                resolve(!err);
            });
        });
    }

    // GIT INIT
    async function gitInit(folder: string) {
        const isRepo = await checkIsGitRepo(folder);
        if (isRepo) {
            vscode.window.showInformationMessage('Ya es un repositorio Git');
            vscode.commands.executeCommand('push-it.sendToPanel', {
                command: 'initResult',
                success: true,
                alreadyRepo: true
            });
            updateGitInfo(folder);
            return;
        }

        exec('git init', { cwd: folder }, (error, stdout, stderr) => {
            if (error) {
                vscode.window.showErrorMessage(`Error al inicializar: ${stderr || error.message}`);
                vscode.commands.executeCommand('push-it.sendToPanel', {
                    command: 'initResult',
                    success: false,
                    error: stderr || error.message
                });
            } else {
                vscode.window.showInformationMessage('✅ Repositorio inicializado');
                vscode.commands.executeCommand('push-it.sendToPanel', {
                    command: 'initResult',
                    success: true
                });
                updateGitInfo(folder);
            }
        });
    }

    // CHECK REMOTE
    async function checkRemote(folder: string) {
        exec('git remote -v', { cwd: folder }, (error, stdout, stderr) => {
            if (error) {
                vscode.commands.executeCommand('push-it.sendToPanel', {
                    command: 'remoteStatus',
                    hasRemote: false,
                    remotes: []
                });
                return;
            }

            const lines = stdout.split('\n').filter(line => line.trim());
            const remotes = lines.map(line => {
                const parts = line.split('\t');
                const urlPart = parts[1] ? parts[1].split(' ')[0] : '';
                return {
                    name: parts[0],
                    url: urlPart
                };
            });

            const uniqueRemotes = remotes.filter((remote, index, self) => 
                index === self.findIndex(r => r.name === remote.name && r.url === remote.url)
            );

            vscode.commands.executeCommand('push-it.sendToPanel', {
                command: 'remoteStatus',
                hasRemote: uniqueRemotes.length > 0,
                remotes: uniqueRemotes
            });
        });
    }

    // ADD REMOTE
    async function addRemote(folder: string, url: string) {
        if (!url) {
            vscode.window.showErrorMessage('La URL del repositorio no puede estar vacía');
            return;
        }

        exec(`git remote add origin ${url}`, { cwd: folder }, (error, stdout, stderr) => {
            if (error) {
                vscode.window.showErrorMessage(`Error al añadir remote: ${stderr || error.message}`);
                vscode.commands.executeCommand('push-it.sendToPanel', {
                    command: 'remoteResult',
                    success: false,
                    error: stderr || error.message
                });
            } else {
                vscode.window.showInformationMessage(`✅ Remote añadido: origin -> ${url}`);
                vscode.commands.executeCommand('push-it.sendToPanel', {
                    command: 'remoteResult',
                    success: true
                });
                checkRemote(folder);
            }
        });
    }

    // GIT COMMIT
    async function gitCommit(folder: string, message: string) {
        if (!message.trim()) {
            vscode.window.showErrorMessage('El mensaje de commit no puede estar vacío');
            vscode.commands.executeCommand('push-it.sendToPanel', {
                command: 'commitResult',
                success: false,
                error: 'Mensaje vacío'
            });
            return;
        }

        exec('git status --porcelain', { cwd: folder }, (statusError, statusStdout) => {
            if (statusError || !statusStdout.trim()) {
                vscode.window.showWarningMessage('No hay cambios para commit');
                vscode.commands.executeCommand('push-it.sendToPanel', {
                    command: 'commitResult',
                    success: false,
                    error: 'No hay cambios para commit'
                });
                return;
            }

            const commitCommand = `git add . && git commit -m "${message.replace(/"/g, '\\"')}"`;
            
            exec(commitCommand, { cwd: folder }, (commitError, commitStdout, commitStderr) => {
                if (commitError) {
                    vscode.window.showErrorMessage(`Error al hacer commit: ${commitStderr || commitError.message}`);
                    vscode.commands.executeCommand('push-it.sendToPanel', {
                        command: 'commitResult',
                        success: false,
                        error: commitStderr || commitError.message
                    });
                } else {
                    vscode.window.showInformationMessage('✅ Commit realizado exitosamente');
                    vscode.commands.executeCommand('push-it.sendToPanel', {
                        command: 'commitResult',
                        success: true
                    });
                    updateGitInfo(folder);
                }
            });
        });
    }

    // GIT PUSH (VERSIÓN COMPLETA CON SELECTOR DE RAMAS)
    async function gitPush(folder: string) {
        // Primero verificar si hay remote
        exec('git remote', { cwd: folder }, (remoteError, remoteStdout) => {
            if (remoteError || !remoteStdout.trim()) {
                vscode.window.showWarningMessage('No hay repositorio remoto configurado');
                vscode.commands.executeCommand('push-it.sendToPanel', {
                    command: 'pushResult',
                    success: false,
                    error: 'no-remote'
                });
                return;
            }

            // Obtener la rama actual
            exec('git branch --show-current', { cwd: folder }, (branchError, branchStdout) => {
                const currentBranch = branchStdout.trim();
                
                if (!currentBranch) {
                    vscode.window.showErrorMessage('No hay una rama activa. Haz un commit primero.');
                    vscode.commands.executeCommand('push-it.sendToPanel', {
                        command: 'pushResult',
                        success: false,
                        error: 'no-branch'
                    });
                    return;
                }
                
                // Obtener todas las ramas remotas
                exec('git ls-remote --heads origin', { cwd: folder }, (remoteBranchesError, remoteBranchesStdout) => {
                    // Procesar ramas remotas
                    const remoteBranches: string[] = [];
                    if (remoteBranchesStdout) {
                        const lines = remoteBranchesStdout.split('\n');
                        lines.forEach(line => {
                            const match = line.match(/refs\/heads\/(.+)$/);
                            if (match && match[1]) {
                                remoteBranches.push(match[1]);
                            }
                        });
                    }
                    
                    // Crear opciones para el QuickPick
                    const options: vscode.QuickPickItem[] = [];
                    
                    // Opción 1: Push a rama actual
                    options.push({
                        label: `$(git-branch) Rama actual: ${currentBranch}`,
                        description: 'Hacer push a la rama actual',
                    });
                    
                    // Separador si hay ramas remotas
                    if (remoteBranches.length > 0) {
                        options.push({
                            label: 'Ramas remotas existentes',
                            kind: vscode.QuickPickItemKind.Separator
                        });
                        
                        // Añadir cada rama remota
                        remoteBranches.forEach(branch => {
                            if (branch !== currentBranch) {
                                options.push({
                                    label: `$(repo) ${branch}`,
                                    description: `Hacer push a rama remota ${branch}`,
                                });
                            }
                        });
                    }
                    
                    // Separador para acciones
                    options.push({
                        label: 'Acciones',
                        kind: vscode.QuickPickItemKind.Separator
                    });
                    
                    // Opción para nueva rama
                    options.push({
                        label: '$(new-branch) Crear nueva rama...',
                        description: 'Push a una rama nueva',
                    });
                    
                    // Opción para cancelar
                    options.push({
                        label: '$(circle-slash) Cancelar',
                        description: 'No hacer push',
                    });
                    
                    // Mostrar el QuickPick al usuario
                    vscode.window.showQuickPick(options, {
                        placeHolder: `¿A qué rama quieres hacer push? (rama actual: ${currentBranch})`,
                        title: 'Push It - Seleccionar rama destino',
                        matchOnDescription: true,
                        matchOnDetail: true
                    }).then(selectedItem => {
                        if (!selectedItem) {
                            return; // Usuario canceló
                        }
                        
                        const selectedLabel = selectedItem.label;
                        
                        // Cancelar
                        if (selectedLabel.includes('Cancelar')) {
                            return;
                        }
                        
                        // Crear nueva rama
                        if (selectedLabel.includes('Crear nueva rama')) {
                            vscode.window.showInputBox({
                                prompt: 'Nombre de la nueva rama',
                                placeHolder: 'feature/nueva-funcionalidad',
                                validateInput: (value) => {
                                    if (!value) return 'El nombre no puede estar vacío';
                                    if (value.includes(' ')) return 'El nombre no puede contener espacios';
                                    if (value.includes('..')) return 'El nombre no puede contener ".."';
                                    if (value.includes('~')) return 'El nombre no puede contener "~"';
                                    if (value.includes('^')) return 'El nombre no puede contener "^"';
                                    if (value.includes(':')) return 'El nombre no puede contener ":"';
                                    if (value.includes('?')) return 'El nombre no puede contener "?"';
                                    if (value.includes('*')) return 'El nombre no puede contener "*"';
                                    if (value.includes('[')) return 'El nombre no puede contener "["';
                                    return null;
                                }
                            }).then(newBranchName => {
                                if (newBranchName) {
                                    // Preguntar si quiere cambiar a la nueva rama localmente
                                    vscode.window.showInformationMessage(
                                        `¿Quieres crear y cambiar a la rama '${newBranchName}' localmente?`,
                                        'Sí, crear y cambiar', 'Solo crear rama remota', 'Cancelar'
                                    ).then(option => {
                                        if (option === 'Sí, crear y cambiar') {
                                            // Crear rama local y cambiar
                                            exec(`git checkout -b ${newBranchName}`, { cwd: folder }, (checkoutError) => {
                                                if (checkoutError) {
                                                    vscode.window.showErrorMessage(`Error al crear rama local: ${checkoutError.message}`);
                                                    return;
                                                }
                                                // Hacer push de la nueva rama
                                                exec(`git push -u origin ${newBranchName}`, { cwd: folder }, (pushError, pushStdout, pushStderr) => {
                                                    if (pushError) {
                                                        vscode.window.showErrorMessage(`Error al hacer push: ${pushStderr || pushError.message}`);
                                                        vscode.commands.executeCommand('push-it.sendToPanel', {
                                                            command: 'pushResult',
                                                            success: false,
                                                            error: pushStderr || pushError.message
                                                        });
                                                    } else {
                                                        vscode.window.showInformationMessage(`✅ Rama '${newBranchName}' creada y push completado`);
                                                        vscode.commands.executeCommand('push-it.sendToPanel', {
                                                            command: 'pushResult',
                                                            success: true
                                                        });
                                                        updateGitInfo(folder);
                                                    }
                                                });
                                            });
                                        } else if (option === 'Solo crear rama remota') {
                                            // Solo crear rama remota
                                            exec(`git push origin ${currentBranch}:${newBranchName}`, { cwd: folder }, (pushError, pushStdout, pushStderr) => {
                                                if (pushError) {
                                                    vscode.window.showErrorMessage(`Error al crear rama remota: ${pushStderr || pushError.message}`);
                                                } else {
                                                    vscode.window.showInformationMessage(`✅ Rama remota '${newBranchName}' creada desde ${currentBranch}`);
                                                }
                                            });
                                        }
                                    });
                                }
                            });
                            return;
                        }
                        
                        // Determinar rama destino
                        let targetBranch = currentBranch;
                        
                        // Si seleccionó una rama específica (que no es la actual)
                        if (!selectedLabel.includes('Rama actual') && !selectedLabel.includes('Cancelar')) {
                            // Extraer nombre de rama del label
                            const branchMatch = selectedLabel.match(/\$\(repo\) (.+)$/);
                            if (branchMatch && branchMatch[1]) {
                                targetBranch = branchMatch[1];
                            }
                        }
                        
                        // Ejecutar push
                        if (targetBranch === currentBranch) {
                            // Push a la misma rama
                            exec('git push', { cwd: folder }, (pushError, pushStdout, pushStderr) => {
                                if (pushError && pushStderr && pushStderr.includes('no upstream branch')) {
                                    // Primer push, necesita -u
                                    exec(`git push -u origin ${currentBranch}`, { cwd: folder }, (uError, uStdout, uStderr) => {
                                        if (uError) {
                                            vscode.window.showErrorMessage(`Error al hacer push: ${uStderr || uError.message}`);
                                            vscode.commands.executeCommand('push-it.sendToPanel', {
                                                command: 'pushResult',
                                                success: false,
                                                error: uStderr || uError.message
                                            });
                                        } else {
                                            vscode.window.showInformationMessage(`✅ Push completado a ${currentBranch}`);
                                            vscode.commands.executeCommand('push-it.sendToPanel', {
                                                command: 'pushResult',
                                                success: true
                                            });
                                        }
                                    });
                                } else if (pushError) {
                                    vscode.window.showErrorMessage(`Error al hacer push: ${pushStderr || pushError.message}`);
                                    vscode.commands.executeCommand('push-it.sendToPanel', {
                                        command: 'pushResult',
                                        success: false,
                                        error: pushStderr || pushError.message
                                    });
                                } else {
                                    vscode.window.showInformationMessage('✅ Push completado');
                                    vscode.commands.executeCommand('push-it.sendToPanel', {
                                        command: 'pushResult',
                                        success: true
                                    });
                                }
                            });
                        } else {
                            // Push a rama diferente
                            exec(`git push origin ${currentBranch}:${targetBranch}`, { cwd: folder }, (pushError, pushStdout, pushStderr) => {
                                if (pushError) {
                                    vscode.window.showErrorMessage(`Error al hacer push a ${targetBranch}: ${pushStderr || pushError.message}`);
                                    vscode.commands.executeCommand('push-it.sendToPanel', {
                                        command: 'pushResult',
                                        success: false,
                                        error: pushStderr || pushError.message
                                    });
                                } else {
                                    vscode.window.showInformationMessage(`✅ Push completado de ${currentBranch} → ${targetBranch}`);
                                    vscode.commands.executeCommand('push-it.sendToPanel', {
                                        command: 'pushResult',
                                        success: true
                                    });
                                }
                            });
                        }
                    });
                });
            });
        });
    }

    // GIT PULL
    async function gitPull(folder: string) {
        exec('git pull', { cwd: folder }, (error, stdout, stderr) => {
            if (error) {
                vscode.window.showErrorMessage(`Error al hacer pull: ${stderr || error.message}`);
                vscode.commands.executeCommand('push-it.sendToPanel', {
                    command: 'pullResult',
                    success: false,
                    error: stderr || error.message
                });
            } else {
                vscode.window.showInformationMessage('✅ Pull completado');
                vscode.commands.executeCommand('push-it.sendToPanel', {
                    command: 'pullResult',
                    success: true
                });
                updateGitInfo(folder);
            }
        });
    }

    // ===== NUEVAS FUNCIONES PARA .GITIGNORE =====

    // Obtener contenido del .gitignore
    async function getGitIgnoreContent(folder: string) {
        const gitIgnorePath = path.join(folder, '.gitignore');
        
        try {
            if (fs.existsSync(gitIgnorePath)) {
                const content = fs.readFileSync(gitIgnorePath, 'utf8');
                const patterns = content.split('\n')
                    .filter(line => line.trim() && !line.startsWith('#'))
                    .map(line => line.trim());
                
                vscode.commands.executeCommand('push-it.sendToPanel', {
                    command: 'gitIgnoreContent',
                    patterns: patterns
                });
            } else {
                // No existe .gitignore, enviar array vacío
                vscode.commands.executeCommand('push-it.sendToPanel', {
                    command: 'gitIgnoreContent',
                    patterns: []
                });
            }
        } catch (error) {
            console.error('Error al leer .gitignore:', error);
        }
    }

    // Añadir patrón al .gitignore
    async function addToGitIgnore(folder: string, pattern: string) {
        const gitIgnorePath = path.join(folder, '.gitignore');
        
        try {
            let content = '';
            if (fs.existsSync(gitIgnorePath)) {
                content = fs.readFileSync(gitIgnorePath, 'utf8');
            }
            
            // Verificar si el patrón ya existe
            const patterns = content.split('\n').map(line => line.trim());
            if (!patterns.includes(pattern)) {
                content += (content.endsWith('\n') ? '' : '\n') + pattern + '\n';
                fs.writeFileSync(gitIgnorePath, content);
                
                vscode.window.showInformationMessage(`✅ Añadido "${pattern}" a .gitignore`);
                
                // Actualizar la lista en el panel
                getGitIgnoreContent(folder);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error al añadir a .gitignore: ${error}`);
        }
    }

    // Eliminar patrón del .gitignore
    async function removeFromGitIgnore(folder: string, pattern: string) {
        const gitIgnorePath = path.join(folder, '.gitignore');
        
        try {
            if (fs.existsSync(gitIgnorePath)) {
                let content = fs.readFileSync(gitIgnorePath, 'utf8');
                const lines = content.split('\n');
                const filtered = lines.filter(line => line.trim() !== pattern);
                fs.writeFileSync(gitIgnorePath, filtered.join('\n'));
                
                vscode.window.showInformationMessage(`✅ Eliminado "${pattern}" de .gitignore`);
                
                // Actualizar la lista en el panel
                getGitIgnoreContent(folder);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error al eliminar de .gitignore: ${error}`);
        }
    }

    // UPDATE GIT INFO (modificado para incluir .gitignore)
    async function updateGitInfo(folder: string) {
        if (!folder) return;

        const isRepo = await checkIsGitRepo(folder);
        
        if (!isRepo) {
            vscode.commands.executeCommand('push-it.sendToPanel', {
                command: 'notGitRepo',
                message: 'No es un repositorio Git'
            });
            return;
        }

        // Obtener rama actual
        exec('git branch --show-current', { cwd: folder }, (error, stdout) => {
            if (!error) {
                vscode.commands.executeCommand('push-it.sendToPanel', {
                    command: 'updateBranch',
                    branch: stdout.trim() || 'sin rama'
                });
            }
        });

        // Obtener cambios pendientes
        exec('git status --porcelain', { cwd: folder }, (error, stdout) => {
            if (!error) {
                const changes = stdout.split('\n')
                    .filter(line => line.trim())
                    .map(line => ({
                        status: line.substring(0, 2).trim(),
                        file: line.substring(3)
                    }));
                
                vscode.commands.executeCommand('push-it.sendToPanel', {
                    command: 'updateChanges',
                    changes: changes
                });
            }
        });

        // Verificar remotos
        checkRemote(folder);
        
        // Obtener .gitignore
        getGitIgnoreContent(folder);
    }

    // Auto-refresh
    setInterval(() => {
        const folder = getWorkspaceFolder();
        if (folder) {
            updateGitInfo(folder);
        }
    }, 5000);

    vscode.window.onDidChangeActiveTextEditor(() => {
        const folder = getWorkspaceFolder();
        if (folder) {
            updateGitInfo(folder);
        }
    });

    const folder = getWorkspaceFolder();
    if (folder) {
        updateGitInfo(folder);
    } else {
        vscode.commands.executeCommand('push-it.sendToPanel', {
            command: 'noWorkspace',
            message: 'Abre una carpeta para comenzar'
        });
    }
}

export function deactivate() {}