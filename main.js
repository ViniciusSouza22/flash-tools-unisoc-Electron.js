const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const os = require('os');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'icon.png'),
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#8a0880',
      symbolColor: '#ffffff'
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers
ipcMain.handle('select-firmware-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (result.canceled) {
    return { canceled: true };
  }
  
  const folderPath = result.filePaths[0];
  const files = fs.readdirSync(folderPath);
  
  return {
    canceled: false,
    path: folderPath,
    files: files
  };
});

ipcMain.handle('run-firmware-flash', async (event, folderPath) => {
  return new Promise((resolve) => {
    const exePath = path.join(folderPath, 'spd_dump.exe');
    
    // Verificar se o spd_dump.exe existe
    if (!fs.existsSync(exePath)) {
      resolve({ success: false, output: 'spd_dump.exe não encontrado' });
      return;
    }

    // Criar um arquivo batch temporário
    const tempBatPath = path.join(os.tmpdir(), `flash_unisoc_${Date.now()}.bat`);
    
    // Conteúdo do arquivo batch
    const batchContent = `@echo off
echo ======================================
echo Iniciando flash com spd_dump.exe
echo ======================================

cd /d "${folderPath}"

"${exePath}" --wait 300 ^
baudrate 115200 ^
exec_addr 0x3ee8 ^
fdl fdl1-moto-java.bin 0x5500 ^
fdl fdl2-moto-java.bin 0x9EFFFE00 ^
exec ^
verbose 0 ^
disable_transcode ^
keep_charge 1 ^
skip_confirm 1 ^
timeout 333666999 ^
erase_part splloader ^
erase_part uboot_log ^
write_part vbmeta_a vbmeta-sign.img ^
write_part vbmeta_b vbmeta-sign.img ^
write_part vbmeta_system_a vbmeta_system.img ^
write_part vbmeta_system_b vbmeta_system.img ^
write_part vbmeta_system_ext_a vbmeta_system_ext.img ^
write_part vbmeta_system_ext_b vbmeta_system_ext.img ^
write_part vbmeta_vendor_a vbmeta_vendor.img ^
write_part vbmeta_vendor_b vbmeta_vendor.img ^
write_part vbmeta_product_a vbmeta_product.img ^
write_part vbmeta_product_b vbmeta_product.img ^
write_part boot_a boot.img ^
write_part boot_b boot.img ^
write_part dtbo_a dtbo.img ^
write_part dtbo_b dtbo.img ^
write_part super super.img ^
write_part cache cache.img ^
erase_part userdata ^
erase_part metadata ^
write_part splloader u-boot-spl-16k-sign.bin ^
reset

echo ======================================
echo Processo concluído!
echo ======================================
pause`;

    // Escrever o arquivo batch temporário
    fs.writeFileSync(tempBatPath, batchContent, 'utf8');

    // Executar o arquivo batch
    const batProcess = spawn('cmd.exe', ['/c', tempBatPath], {
      cwd: folderPath,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let output = '';
    
    batProcess.stdout.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      // Enviar para a janela em tempo real
      mainWindow.webContents.send('flash-output', dataStr);
    });
    
    batProcess.stderr.on('data', (data) => {
      const dataStr = data.toString();
      output += dataStr;
      mainWindow.webContents.send('flash-output', dataStr);
    });
    
    batProcess.on('close', (code) => {
      // Excluir o arquivo temporário
      try {
        fs.unlinkSync(tempBatPath);
      } catch (e) {
        console.error('Erro ao excluir arquivo temporário:', e);
      }
      
      resolve({ 
        success: code === 0, 
        output: output,
        exitCode: code
      });
    });
    
    batProcess.on('error', (error) => {
      // Excluir o arquivo temporário em caso de erro
      try {
        fs.unlinkSync(tempBatPath);
      } catch (e) {
        console.error('Erro ao excluir arquivo temporário:', e);
      }
      
      resolve({ 
        success: false, 
        output: error.message
      });
    });
  });
});

ipcMain.handle('connect-device', async (event, device) => {
  // Implementar lógica real de conexão com dispositivo
  return { success: true, message: `Dispositivo ${device} conectado` };
});

ipcMain.handle('reboot-device', async () => {
  // Implementar lógica real de reinicialização
  return { success: true, message: "Dispositivo reiniciado" };
});

ipcMain.handle('close-app', () => {
  app.quit();
});

ipcMain.handle('minimize-app', () => {
  mainWindow.minimize();
});

ipcMain.handle('maximize-app', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});