 // Elementos do DOM
        const selectFilesBtn = document.getElementById('selectFilesBtn');
        const flashBtn = document.getElementById('flashBtn');
        const statusArea = document.getElementById('statusArea');
        const fileListContainer = document.getElementById('fileListContainer');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        const deviceItems = document.querySelectorAll('.device-item');
        const selectedDeviceSpan = document.getElementById('selectedDevice');
        const clearLogsBtn = document.getElementById('clearLogsBtn');
        const checkFilesBtn = document.getElementById('checkFilesBtn');
        const connectDeviceBtn = document.getElementById('connectDeviceBtn');
        const rebootDeviceBtn = document.getElementById('rebootDeviceBtn');
        const responseText = document.getElementById('responseText');
        const folderPath = document.getElementById('folderPath');
        const closeBtn = document.getElementById('closeBtn');
        const minimizeBtn = document.getElementById('minimizeBtn');
        const maximizeBtn = document.getElementById('maximizeBtn');
        const deviceSearch = document.querySelector('.device-search');
        const notification = document.getElementById('notification');

        // Lista de arquivos essenciais
        const essentialFiles = [
            "vbmeta-sign.img",
            "vbmeta_system.img",
            "vbmeta_system_ext.img",
            "vbmeta_vendor.img",
            "vbmeta_product.img",
            "boot.img",
            "dtbo.img",
            "super.img",
            "cache.img",
            "u-boot-spl-16k-sign.bin",
            "spd_dump.exe",
            "fdl1-moto-java.bin",
            "fdl2-moto-java.bin"
        ];

        // Variáveis de estado
        let firmwarePath = "";
        let firmwareFiles = [];
        let selectedDevice = "Unisoc T700";
        let isFlashing = false;
        let progressInterval;

        // Função para mostrar notificação
        function showNotification(message, type = 'info') {
            notification.textContent = message;
            notification.className = `notification ${type}`;
            notification.classList.add('show');
            
            setTimeout(() => {
                notification.classList.remove('show');
            }, 3000);
        }

        // Função para adicionar logs
        function addLog(msg, type = 'info') {
            const lines = msg.split('\n');
            lines.forEach(line => {
                if (line.trim() === '') return;
                
                const div = document.createElement('div');
                div.classList.add(`log-${type}`);
                
                // Adicionar timestamp
                const now = new Date();
                const timestamp = `[${now.toLocaleTimeString()}]`;
                
                div.textContent = `${timestamp} ${line}`;
                statusArea.appendChild(div);
            });
            statusArea.scrollTop = statusArea.scrollHeight;
        }

        // Inicializar lista de arquivos
        function initializeFileList() {
            fileListContainer.innerHTML = '';
            essentialFiles.forEach(fileName => {
                const div = document.createElement('div');
                div.classList.add('file-item', 'missing');
                div.textContent = fileName;
                div.dataset.file = fileName;
                fileListContainer.appendChild(div);
            });
        }

        // Atualizar status dos arquivos
        function updateFileStatus() {
            const fileItems = fileListContainer.querySelectorAll('.file-item');
            fileItems.forEach(item => {
                const fileName = item.dataset.file;
                if (firmwareFiles.includes(fileName)) {
                    item.classList.remove('missing');
                    item.classList.add('present');
                } else {
                    item.classList.remove('present');
                    item.classList.add('missing');
                }
            });
        }

        // Atualizar progresso
        function updateProgress(percent, text = null) {
            // Garantir que o percentual esteja entre 0 e 100
            percent = Math.max(0, Math.min(100, percent));
            
            progressFill.style.width = `${percent}%`;
            progressText.textContent = `${percent}%`;
            if (text) responseText.textContent = text;
        }

        // Filtrar dispositivos
        function filterDevices() {
            const searchTerm = deviceSearch.value.toLowerCase();
            deviceItems.forEach(item => {
                const deviceName = item.dataset.device.toLowerCase();
                if (deviceName.includes(searchTerm)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        }

        // Simular progresso (para demonstração)
        function simulateProgress() {
            let progress = 0;
            clearInterval(progressInterval);
            
            progressInterval = setInterval(() => {
                progress += 5;
                updateProgress(progress, `Executando flash (${progress}%)`);
                
                if (progress === 20) addLog('Conectando ao dispositivo...', 'info');
                if (progress === 40) addLog('Enviando partições...', 'info');
                if (progress === 60) addLog('Escrevendo vbmeta...', 'info');
                if (progress === 80) addLog('Aplicando firmware...', 'info');
                
                if (progress >= 100) {
                    clearInterval(progressInterval);
                    addLog('✅ Flash concluído com sucesso!', 'success');
                    addLog('Reiniciando dispositivo...', 'info');
                    
                    setTimeout(() => {
                        addLog('✅ Dispositivo reiniciado com sucesso!', 'success');
                        updateProgress(100, 'Flash finalizado!');
                        flashBtn.disabled = false;
                        isFlashing = false;
                        showNotification('Flash concluído com sucesso', 'success');
                    }, 2000);
                }
            }, 300);
        }

        // Inicialização
        addLog('Sistema inicializado. Aguardando comando...');
        initializeFileList();

        // Controles da janela
        closeBtn.addEventListener('click', () => {
            if (typeof window.electronAPI !== 'undefined') {
                window.electronAPI.closeApp();
            } else {
                showNotification('Funcionalidade disponível apenas no Electron', 'warning');
            }
        });

        minimizeBtn.addEventListener('click', () => {
            if (typeof window.electronAPI !== 'undefined') {
                window.electronAPI.minimizeApp();
            } else {
                showNotification('Funcionalidade disponível apenas no Electron', 'warning');
            }
        });

        maximizeBtn.addEventListener('click', () => {
            if (typeof window.electronAPI !== 'undefined') {
                window.electronAPI.maximizeApp();
            } else {
                showNotification('Funcionalidade disponível apenas no Electron', 'warning');
            }
        });

        // Pesquisa de dispositivos
        deviceSearch.addEventListener('input', filterDevices);

        // Seleção de dispositivo
        deviceItems.forEach(item => {
            item.addEventListener('click', () => {
                deviceItems.forEach(d => d.classList.remove('selected'));
                item.classList.add('selected');
                selectedDevice = item.dataset.device;
                selectedDeviceSpan.textContent = selectedDevice;
                addLog(`▶️ Dispositivo '${selectedDevice}' selecionado.`, 'info');
            });
        });

        // Seleção da pasta de firmware
        selectFilesBtn.addEventListener('click', async () => {
            if (isFlashing) {
                showNotification('Aguarde o flash terminar antes de selecionar outra pasta', 'warning');
                return;
            }
            
            addLog('Abrindo seletor de pasta...', 'info');
            
            if (typeof window.electronAPI === 'undefined') {
                addLog('❌ API do Electron não disponível. Executando em modo de demonstração.', 'error');
                
                // Modo de demonstração (fallback)
                try {
                    // Simular seleção de pasta
                    const simulatedFiles = [...essentialFiles];
                    firmwarePath = "C:\\Firmware\\Unisoc_T700";
                    firmwareFiles = simulatedFiles;
                    
                    folderPath.textContent = firmwarePath;
                    folderPath.title = firmwarePath;
                    
                    addLog(`📦 Pasta de firmware selecionada: ${firmwarePath}`, 'success');
                    addLog(`${firmwareFiles.length} arquivos encontrados.`, 'info');
                    updateFileStatus();

                    // Verificar se todos os arquivos estão presentes
                    const missingFiles = essentialFiles.filter(file => !firmwareFiles.includes(file));
                    if (missingFiles.length === 0) {
                        addLog('✅ Todos os arquivos essenciais estão presentes!', 'success');
                        flashBtn.disabled = false;
                        showNotification('Todos os arquivos essenciais encontrados', 'success');
                    } else {
                        addLog(`⚠️ Faltam ${missingFiles.length} arquivo(s) essencial(is).`, 'warning');
                        missingFiles.forEach(file => addLog(`   ❌ ${file}`, 'error'));
                        flashBtn.disabled = true;
                        showNotification(`Faltam ${missingFiles.length} arquivos essenciais', 'error`);
                    }
                } catch (error) {
                    addLog(`❌ Erro ao selecionar pasta: ${error.message}`, 'error');
                    showNotification('Erro ao selecionar pasta', 'error');
                }
                return;
            }
            
            try {
                const result = await window.electronAPI.selectFirmwareFolder();
                if (result.canceled) {
                    addLog('Seleção de pasta cancelada.', 'warning');
                    return;
                }
                
                firmwarePath = result.path;
                firmwareFiles = result.files || [];
                
                folderPath.textContent = firmwarePath;
                folderPath.title = firmwarePath;
                
                addLog(`📦 Pasta de firmware selecionada: ${firmwarePath}`, 'success');
                addLog(`${firmwareFiles.length} arquivos encontrados.`, 'info');
                updateFileStatus();

                // Verificar se todos os arquivos estão presentes
                const missingFiles = essentialFiles.filter(file => !firmwareFiles.includes(file));
                if (missingFiles.length === 0) {
                    addLog('✅ Todos os arquivos essenciais estão presentes!', 'success');
                    flashBtn.disabled = false;
                    showNotification('Todos os arquivos essenciais encontrados', 'success');
                } else {
                    addLog(`⚠️ Faltam ${missingFiles.length} arquivo(s) essencial(is).`, 'warning');
                    missingFiles.forEach(file => addLog(`   ❌ ${file}`, 'error'));
                    flashBtn.disabled = true;
                    showNotification(`Faltam ${missingFiles.length} arquivos essenciais`, 'error');
                }
            } catch (error) {
                addLog(`❌ Erro ao selecionar pasta: ${error.message}`, 'error');
                showNotification('Erro ao selecionar pasta', 'error');
            }
        });

        // Verificação de arquivos
        checkFilesBtn.addEventListener('click', () => {
            if (!firmwarePath) {
                addLog('❌ Nenhuma pasta de firmware selecionada.', 'error');
                showNotification('Selecione uma pasta de firmware primeiro', 'error');
                return;
            }
            
            addLog('Verificando arquivos na pasta firmware...', 'info');
            const missingFiles = essentialFiles.filter(file => !firmwareFiles.includes(file));
            
            if (missingFiles.length === 0) {
                addLog('✅ Todos os arquivos essenciais estão presentes!', 'success');
                responseText.textContent = 'Todos os arquivos estão presentes';
                flashBtn.disabled = false;
                showNotification('Todos os arquivos essenciais encontrados', 'success');
            } else {
                addLog(`⚠️ Faltam ${missingFiles.length} arquivo(s) essencial(is):`, 'warning');
                missingFiles.forEach(file => addLog(`   ❌ ${file}`, 'error'));
                responseText.textContent = `Faltam ${missingFiles.length} arquivos`;
                flashBtn.disabled = true;
                showNotification(`Faltam ${missingFiles.length} arquivos essenciais`, 'error');
            }
        });

        // FLASH - Execução dos comandos diretamente
        flashBtn.addEventListener('click', async () => {
            if (!firmwarePath) {
                addLog('❌ Selecione a pasta de firmware primeiro.', 'error');
                showNotification('Selecione uma pasta de firmware primeiro', 'error');
                return;
            }
            
            if (isFlashing) {
                showNotification('Flash já em andamento', 'warning');
                return;
            }
            
            addLog('⚡ Iniciando processo de flash...', 'info');
            isFlashing = true;
            flashBtn.disabled = true;
            updateProgress(0, 'Preparando flash...');
            showNotification('Iniciando processo de flash', 'info');

            // Configurar listener para logs em tempo real
            if (typeof window.electronAPI !== 'undefined') {
                window.electronAPI.onFlashOutput((event, output) => {
                    addLog(output, 'cmd');
                });
            }

            if (typeof window.electronAPI === 'undefined') {
                addLog('❌ API do Electron não disponível. Simulando execução...', 'error');
                simulateProgress();
                return;
            }

            try {
                const result = await window.electronAPI.runFirmwareFlashCMD(firmwarePath);
                
                if (result.success) {
                    clearInterval(progressInterval);
                    updateProgress(100, 'Flash finalizado!');
                    addLog('✅ Flash concluído com sucesso!', 'success');
                    showNotification('Flash concluído com sucesso', 'success');
                } else {
                    clearInterval(progressInterval);
                    updateProgress(0, 'Falha no flash');
                    addLog('❌ Flash finalizado com erro!', 'error');
                    if (result.output) {
                        result.output.split(/\r?\n/).forEach(line => {
                            if (line.trim()) addLog(line, 'error');
                        });
                    }
                    showNotification('Falha durante o flash', 'error');
                }
            } catch (error) {
                clearInterval(progressInterval);
                updateProgress(0, 'Erro no flash');
                addLog(`❌ Erro ao executar flash: ${error.message}`, 'error');
                showNotification('Erro durante o flash', 'error');
            } finally {
                flashBtn.disabled = false;
                isFlashing = false;
                
                // Remover listener após conclusão
                if (typeof window.electronAPI !== 'undefined') {
                    window.electronAPI.removeFlashOutputListeners();
                }
            }
        });


        // Limpar logs
        clearLogsBtn.addEventListener('click', () => {
            statusArea.innerHTML = '';
            addLog('Logs limpos.', 'info');
            responseText.textContent = 'Logs limpos';
            showNotification('Logs limpos', 'info');
        });